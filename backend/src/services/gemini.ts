import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import type { AIRecommendation } from "shared";
import { env } from "../lib/env.js";
import { fetchAirQuality, findNearestStation } from "./air-quality.js";
import { resolveAreaCode } from "./area-code.js";
import { fetchFestivals } from "./festivals.js";
import { toAreaNo } from "./geo.js";
import { searchAddress } from "./geocode.js";
import { fetchLifeIndex } from "./life-index.js";
import { fetchPlaces } from "./places.js";
import { calculateOutdoorScore } from "./score.js";
import { fetchHourlyForecast, fetchWeather, fetchWeeklyForecast } from "./weather.js";

// 무료 등급은 모델별 일일 요청 한도가 작다. 그래서 도구 호출(질문당 3~7회) 대신
// 서버가 데이터를 먼저 모으고 Gemini 는 질문당 한 번(다른 지역 질문이면 두 번)만 부른다.
const SYSTEM_INSTRUCTION = `당신은 대기질·날씨 기반 야외활동 추천 전문가입니다.

## 규칙
1. 아래 "수집된 데이터"에 있는 실제 값만 사용할 것 (환각 금지)
2. 장소 추천 시 places 에 있는 장소만 추천할 것
3. 값이 {"error": ...} 인 항목은 조회에 실패한 것이다. 그 정보는 모른다고 보고 추측하지 말 것
4. 한국어로 답변할 것
5. 질문이 "수집된 데이터"의 지역이 아닌 다른 지역(예: 부산 해운대, 강릉, 제주)에 관한 것이면 needsLocation 에 그 지역명을 적을 것. 나머지 필드는 수집된 데이터로 평소처럼 채운다. 데이터의 지역에 관한 질문이면 needsLocation 은 빈 문자열로 둔다

## 보건 가이드라인 (강제)
- PM10 ≥ 81㎍/㎥ 또는 PM2.5 ≥ 36㎍/㎥ → 야외 활동 추천 차단, 실내 시설만 추천
- 민감군(어린이, 노인, 폐질환/심장질환자) 프로필 시 → PM2.5 ≥ 30㎍/㎥에서도 실내만 추천
- 위반 시 "질병관리청 가이드라인에 따라 호흡기 질환 동반자의 건강을 위해 실내 활동으로 일정을 대체할 것을 권장합니다" 경고 포함

## 대기질 등급 (통합대기환경지수 CAI)
- 0~50: 좋음 / 51~100: 보통 / 101~250: 나쁨 / 251~500: 매우나쁨

## 온열지수(WBGT)
- ≤21: 안전 / 21~25: 주의 / 25~28: 경계 / 28~31: 위험(실내만) / ≥31: 매우위험(외출자제)

## 응답 가이드
- weather: weather 데이터에서 핵심 수치를 채우고, description에 자연어 요약 작성
- airQuality: airQuality 데이터에서 핵심 수치를 채우고, description에 자연어 요약 작성
- timeSlots: 추천 시간대를 우선순위 순으로 배열 (야외활동 무관 질문 시 빈 배열)
- activities: 추천 활동 목록 (야외활동 무관 질문 시 빈 배열)
- summary: 종합 판단. 야외활동과 무관한 질문에도 summary에 답변 작성

## 시간대별·주간 예보 활용
- 사용자가 특정 시간대(오늘 저녁, 내일 오전 등)를 언급하면 hourlyForecast 에서 해당 시간대의 기온·강수확률·하늘상태를 확인할 것
- "이번 주", "주말" 등 며칠에 걸친 질문은 weeklyForecast 로 일별 예보를 확인할 것
- weather 는 현재 관측값이므로, 미래 시점 질문에는 예보 데이터를 우선 참고할 것
- hourlyForecast 의 pop(강수확률)이 50% 이상이면 우산 지참 안내, 70% 이상이면 야외활동 주의 권고
- festivals 는 오늘 이후 열리는 축제·행사다. 축제·행사·공연 관련 질문에 활용할 것`;

export interface AskGeminiInput {
	question: string;
	lat: number;
	lng: number;
	isSensitiveGroup: boolean;
	userMemories?: string[];
}

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

// ── 데이터 수집 ──

const MAX_PLACES = 15;

type Failed = { error: string };

function isFailed<T>(value: T | Failed): value is Failed {
	return typeof value === "object" && value !== null && "error" in value;
}

/** 실패한 항목은 { error } 로 남겨서 모델이 모른다고 답하게 한다. */
async function settle<T>(promise: Promise<T>): Promise<T | Failed> {
	try {
		return await promise;
	} catch (e) {
		return { error: e instanceof Error ? e.message : String(e) };
	}
}

interface ContextOptions {
	lat: number;
	lng: number;
	isSensitiveGroup: boolean;
	/** 다른 지역 질문일 때 축제를 지역코드로 찾기 위한 지역명 */
	areaQuery?: string;
}

async function collectContext({ lat, lng, isSensitiveGroup, areaQuery }: ContextOptions) {
	const area = areaQuery ? resolveAreaCode(areaQuery) : null;
	const [weather, airQuality, lifeIndex, hourlyForecast, weeklyForecast, places, festivals] =
		await Promise.all([
			settle(fetchWeather(lat, lng)),
			settle(fetchAirQuality(findNearestStation(lat, lng))),
			settle(fetchLifeIndex(toAreaNo(lat, lng))),
			settle(fetchHourlyForecast(lat, lng)),
			settle(fetchWeeklyForecast(lat, lng)),
			settle(fetchPlaces(lat, lng, 5, "all")),
			settle(
				fetchFestivals(
					area ? { areaCode: area.areaCode, sigunguCode: area.sigunguCode } : { lat, lng },
				),
			),
		]);

	const outdoorScore =
		isFailed(weather) || isFailed(airQuality) || isFailed(lifeIndex)
			? { error: "날씨·대기질·생활지수 중 일부를 가져오지 못해 계산하지 않음" }
			: calculateOutdoorScore({
					air: airQuality,
					weather,
					lifeIndex,
					isSensitiveGroup,
					hourlyWeather: isFailed(hourlyForecast) ? undefined : hourlyForecast,
				});

	return {
		weather,
		airQuality,
		lifeIndex,
		outdoorScore,
		hourlyForecast,
		weeklyForecast,
		places: isFailed(places) ? places : places.slice(0, MAX_PLACES),
		festivals,
	};
}

// ── 응답 생성 ──

const responseSchema = {
	type: Type.OBJECT,
	properties: {
		summary: { type: Type.STRING, description: "종합 판단 또는 답변" },
		weather: {
			type: Type.OBJECT,
			nullable: true,
			description: "날씨 요약 (weather 데이터 기반)",
			properties: {
				temp: { type: Type.NUMBER },
				feelsLike: { type: Type.NUMBER },
				sky: { type: Type.STRING },
				humidity: { type: Type.NUMBER },
				wbgt: { type: Type.NUMBER, nullable: true },
				description: { type: Type.STRING, description: "날씨 자연어 요약" },
			},
			required: ["temp", "feelsLike", "sky", "humidity", "wbgt", "description"],
		},
		airQuality: {
			type: Type.OBJECT,
			nullable: true,
			description: "대기질 요약 (airQuality 데이터 기반)",
			properties: {
				pm25: { type: Type.NUMBER },
				pm10: { type: Type.NUMBER },
				caiGrade: { type: Type.STRING },
				description: { type: Type.STRING, description: "대기질 자연어 요약" },
			},
			required: ["pm25", "pm10", "caiGrade", "description"],
		},
		timeSlots: {
			type: Type.ARRAY,
			description: "추천 시간대 (우선순위 순)",
			items: {
				type: Type.OBJECT,
				properties: {
					start: { type: Type.STRING, description: "시작 시각 HH:MM" },
					end: { type: Type.STRING, description: "종료 시각 HH:MM" },
					reason: { type: Type.STRING },
				},
				required: ["start", "end", "reason"],
			},
		},
		activities: {
			type: Type.ARRAY,
			description: "추천 활동 목록",
			items: {
				type: Type.OBJECT,
				properties: {
					name: { type: Type.STRING },
					type: { type: Type.STRING, format: "enum", enum: ["outdoor", "indoor"] },
					reason: { type: Type.STRING },
					placeName: { type: Type.STRING, nullable: true },
				},
				required: ["name", "type", "reason", "placeName"],
			},
		},
		cautions: { type: Type.ARRAY, items: { type: Type.STRING } },
		healthWarning: {
			type: Type.STRING,
			nullable: true,
			description: "민감군 경고 (해당 없으면 null)",
		},
		needsLocation: {
			type: Type.STRING,
			description: "질문이 수집된 데이터와 다른 지역에 관한 것이면 그 지역명, 아니면 빈 문자열",
		},
	},
	required: [
		"summary",
		"weather",
		"airQuality",
		"timeSlots",
		"activities",
		"cautions",
		"healthWarning",
		"needsLocation",
	],
};

type GeminiAnswer = AIRecommendation & { needsLocation?: string };

const MAX_RETRIES = 3;
// thinking 토큰도 maxOutputTokens 에 포함되므로 2048 이면 JSON 이 중간에 잘린다.
const MAX_OUTPUT_TOKENS = 8192;

// 이보다 오래 기다리라는 429(예: 무료 등급 일일 한도 소진)는 재시도하지 않고 바로 폴백으로 넘긴다.
const MAX_RETRY_WAIT_SEC = 20;

/** 429 응답에서 재시도까지 기다릴 초를 읽는다. 초 단위로만 적힌 값만 인정한다. */
export function parseRetryDelaySec(message: string): number | undefined {
	const match =
		message.match(/"retryDelay"\s*:\s*"([\d.]+)s"/) ?? message.match(/retry in ([\d.]+)s\b/i);
	return match ? Number(match[1]) : undefined;
}

/** 429(요청 한도)와 503(일시적 과부하)만 다시 시도한다. */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
	for (let attempt = 0; ; attempt++) {
		try {
			return await fn();
		} catch (e) {
			if (attempt >= MAX_RETRIES || !(e instanceof Error)) throw e;
			if (e.message.includes("429")) {
				const waitSec = parseRetryDelaySec(e.message);
				if (waitSec === undefined || waitSec > MAX_RETRY_WAIT_SEC) {
					console.log(`[Gemini] 429 — 재시도 대기 ${waitSec ?? "알 수 없음"}초라서 포기`);
					throw e;
				}
				const delay = Math.ceil(waitSec) * 1000 + 1000;
				console.log(
					`[Gemini] 429 rate limit — ${Math.round(delay / 1000)}초 후 재시도 (${attempt + 1}/${MAX_RETRIES})`,
				);
				await new Promise((r) => setTimeout(r, delay));
			} else if (e.message.includes("503") || e.message.includes("UNAVAILABLE")) {
				const delay = 1000 * 2 ** attempt;
				console.log(
					`[Gemini] 503 과부하 — ${delay / 1000}초 후 재시도 (${attempt + 1}/${MAX_RETRIES})`,
				);
				await new Promise((r) => setTimeout(r, delay));
			} else {
				throw e;
			}
		}
	}
}

async function generateAnswer(
	systemInstruction: string,
	prompt: string,
	context: Awaited<ReturnType<typeof collectContext>>,
): Promise<GeminiAnswer> {
	const response = await withRetry(() =>
		ai.models.generateContent({
			model: env.GEMINI_MODEL,
			contents: `## 사용자 질문
${prompt}

## 수집된 데이터
${JSON.stringify(context)}

위 데이터를 기반으로 응답을 생성하세요.`,
			config: {
				systemInstruction,
				maxOutputTokens: MAX_OUTPUT_TOKENS,
				thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
				responseMimeType: "application/json",
				responseSchema,
			},
		}),
	);

	const text = response.text ?? "";
	const finishReason = response.candidates?.[0]?.finishReason;
	console.log(
		`[Gemini] 응답 (model=${env.GEMINI_MODEL}, finishReason=${finishReason}, thoughts=${response.usageMetadata?.thoughtsTokenCount ?? 0}):`,
		text,
	);

	try {
		return JSON.parse(text) as GeminiAnswer;
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		throw new Error(`응답 JSON 파싱 실패 (finishReason=${finishReason}): ${msg}`);
	}
}

function buildPrompt(input: AskGeminiInput, place: string): string {
	return `데이터 기준 위치: ${place}
민감군 여부: ${input.isSensitiveGroup ? "예" : "아니오"}

질문: ${input.question}`;
}

export async function askGemini(input: AskGeminiInput): Promise<AIRecommendation> {
	const memoryBlock = input.userMemories?.length
		? `\n\n## 사용자 정보 (이전 대화에서 파악)\n${input.userMemories.map((m) => `- ${m}`).join("\n")}`
		: "";
	const systemInstruction = SYSTEM_INSTRUCTION + memoryBlock;

	console.log("[Gemini] 질문:", input.question);
	const here = await collectContext({
		lat: input.lat,
		lng: input.lng,
		isSensitiveGroup: input.isSensitiveGroup,
	});
	let answer = await generateAnswer(
		systemInstruction,
		buildPrompt(input, `사용자 현재 위치 (위도 ${input.lat}, 경도 ${input.lng})`),
		here,
	);

	// 다른 지역 질문이면 그 지역 데이터로 한 번만 더 부른다. 두 번째 응답의 needsLocation 은 무시한다.
	const target = answer.needsLocation?.trim();
	if (target) {
		const coords = await searchAddress(target).catch(() => null);
		if (coords) {
			console.log(`[Gemini] 다른 지역 질문: ${target} → ${coords.address}`);
			const there = await collectContext({
				lat: coords.lat,
				lng: coords.lng,
				isSensitiveGroup: input.isSensitiveGroup,
				areaQuery: target,
			});
			answer = await generateAnswer(
				systemInstruction,
				buildPrompt(input, `${target} (${coords.address}, 위도 ${coords.lat}, 경도 ${coords.lng})`),
				there,
			);
		} else {
			console.log(
				`[Gemini] 다른 지역 질문: "${target}" 좌표를 찾지 못해 현재 위치 기준 답변을 쓴다`,
			);
		}
	}

	const { needsLocation: _needsLocation, ...recommendation } = answer;
	return recommendation;
}
