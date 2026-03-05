import { Hono } from "hono";
import type { AIRecommendation, ApiResponse, AskRequest, AskResponse } from "shared";
import { cacheGet, cacheSet } from "../lib/cache.js";
import { prisma } from "../lib/db.js";
import { verifyToken } from "../lib/jwt.js";
import { nowKST } from "../lib/kst.js";
import { fetchAirQuality, findNearestStation } from "../services/air-quality.js";
import { generateFallback } from "../services/fallback.js";
import { askGemini } from "../services/gemini.js";
import { toAreaNo } from "../services/geo.js";
import { fetchLifeIndex } from "../services/life-index.js";
import { extractMemories, getUserMemories } from "../services/memory.js";
import { fetchPlaces } from "../services/places.js";
import { calculateOutdoorScore } from "../services/score.js";
import { fetchWeather } from "../services/weather.js";

export const askRoute = new Hono();

const CACHE_TTL = 1800; // 30분

function buildCacheKey(lat: number, lng: number, question: string): string {
	const now = nowKST();
	const slot = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${now.getMinutes() < 30 ? "00" : "30"}`;
	const qHash = Array.from(question.slice(0, 50))
		.reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
		.toString(36);
	return `ai:${lat.toFixed(2)}:${lng.toFixed(2)}:${slot}:${qHash}`;
}

/** Authorization 헤더에서 userId를 추출. 토큰 없거나 무효하면 null. */
async function optionalUserId(c: {
	req: { header: (name: string) => string | undefined };
}): Promise<string | null> {
	const auth = c.req.header("Authorization");
	if (!auth?.startsWith("Bearer ")) return null;
	const payload = await verifyToken(auth.slice(7));
	if (!payload) return null;
	const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true } });
	return user?.id ?? null;
}

askRoute.post("/", async (c) => {
	const body = await c.req.json<AskRequest>();
	const { question, profile, location } = body;

	if (!question || !location?.lat || !location?.lng) {
		return c.json<ApiResponse<never>>(
			{ success: false, error: { code: "MISSING_PARAM", message: "question, location 필요" } },
			400,
		);
	}

	const { lat, lng } = location;
	const isSensitiveGroup = profile?.isSensitiveGroup ?? false;
	const userId = await optionalUserId(c);

	try {
		const cacheKey = buildCacheKey(lat, lng, question);
		const cached = await cacheGet<AIRecommendation>(cacheKey);
		if (cached) {
			console.log("[Ask] 캐시 히트:", cacheKey);
			return c.json<ApiResponse<AskResponse>>({
				success: true,
				data: { recommendation: cached, cached: true },
			});
		}

		// 로그인 사용자면 메모리 조회
		const userMemories = userId ? await getUserMemories(userId) : undefined;

		let recommendation: AIRecommendation;
		try {
			recommendation = await askGemini({ question, lat, lng, isSensitiveGroup, userMemories });
		} catch (geminiErr) {
			console.error(
				"[Ask] Gemini 실패:",
				geminiErr instanceof Error ? geminiErr.message : geminiErr,
			);
			// Gemini 실패 시 전체 데이터 수집 후 폴백
			const stationName = findNearestStation(lat, lng);
			const areaNo = toAreaNo(lat, lng);
			const [weather, lifeIndex, places] = await Promise.all([
				fetchWeather(lat, lng),
				fetchLifeIndex(areaNo),
				fetchPlaces(lat, lng, 5, "all"),
			]);
			const air = await fetchAirQuality(stationName);
			const score = calculateOutdoorScore({ air, weather, lifeIndex, isSensitiveGroup });
			recommendation = generateFallback({ air, weather, score, places, isSensitiveGroup });
		}

		await cacheSet(cacheKey, recommendation, CACHE_TTL);

		// 로그인 사용자면 비동기로 메모리 추출 (응답 지연 없음)
		if (userId) {
			extractMemories(userId, question, recommendation.summary, userMemories ?? []).catch((e) =>
				console.error("[Memory] 추출 실패:", e),
			);
		}

		return c.json<ApiResponse<AskResponse>>({
			success: true,
			data: { recommendation, cached: false },
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : "알 수 없는 오류";
		return c.json<ApiResponse<never>>(
			{ success: false, error: { code: "ASK_ERROR", message } },
			500,
		);
	}
});
