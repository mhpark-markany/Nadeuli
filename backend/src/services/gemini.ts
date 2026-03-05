import { type FunctionDeclaration, GoogleGenAI, Type } from "@google/genai";
import type { AIRecommendation } from "shared";
import { aiRecommendationSchema } from "shared";
import type { ZodType } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { env } from "../lib/env.js";
import { fetchAirQuality, findNearestStation } from "./air-quality.js";
import { resolveAreaCode } from "./area-code.js";
import { fetchFestivals } from "./festivals.js";
import { toAreaNo } from "./geo.js";
import { searchAddress } from "./geocode.js";
import { fetchLifeIndex } from "./life-index.js";
import { fetchPlaces } from "./places.js";
import { calculateOutdoorScore } from "./score.js";
import { fetchWeather } from "./weather.js";

const SYSTEM_INSTRUCTION = `당신은 대기질·날씨 기반 야외활동 추천 전문가입니다.

## 규칙
1. 사용자 질문에 필요한 데이터를 도구(function)를 호출하여 수집할 것
2. 반드시 도구로 가져온 실제 데이터만 사용할 것 (환각 금지)
3. 장소 추천 시 get_places로 가져온 장소만 추천할 것
4. 한국어로 답변할 것

## 보건 가이드라인 (강제)
- PM10 ≥ 81㎍/㎥ 또는 PM2.5 ≥ 36㎍/㎥ → 야외 활동 추천 차단, 실내 시설만 추천
- 민감군(어린이, 노인, 폐질환/심장질환자) 프로필 시 → PM2.5 ≥ 30㎍/㎥에서도 실내만 추천
- 위반 시 "질병관리청 가이드라인에 따라 호흡기 질환 동반자의 건강을 위해 실내 활동으로 일정을 대체할 것을 권장합니다" 경고 포함

## 대기질 등급 (통합대기환경지수 CAI)
- 0~50: 좋음 / 51~100: 보통 / 101~250: 나쁨 / 251~500: 매우나쁨

## 온열지수(WBGT)
- ≤21: 안전 / 21~25: 주의 / 25~28: 경계 / 28~31: 위험(실내만) / ≥31: 매우위험(외출자제)

## 응답 가이드
- weather: get_weather 결과에서 핵심 수치를 채우고, description에 자연어 요약 작성
- airQuality: get_air_quality 결과에서 핵심 수치를 채우고, description에 자연어 요약 작성
- timeSlots: 추천 시간대를 우선순위 순으로 배열 (야외활동 무관 질문 시 빈 배열)
- activities: 추천 활동 목록 (야외활동 무관 질문 시 빈 배열)
- summary: 종합 판단. 야외활동과 무관한 질문에도 summary에 답변 작성`;

const FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
	{
		name: "get_coordinates",
		description:
			"지역명/장소명을 좌표(위도, 경도)로 변환합니다. 사용자가 특정 지역을 언급하면 이 도구로 좌표를 먼저 조회하세요.",
		parameters: {
			type: Type.OBJECT,
			properties: {
				query: {
					type: Type.STRING,
					description: "지역명 또는 장소명 (예: 강남역, 부산 해운대, 제주도)",
				},
			},
			required: ["query"],
		},
	},
	{
		name: "get_area_code",
		description:
			"지역명을 TourAPI 지역코드로 변환합니다. 축제/행사 조회 시 특정 시/도나 시/군/구 전체를 검색할 때 사용하세요.",
		parameters: {
			type: Type.OBJECT,
			properties: {
				query: {
					type: Type.STRING,
					description: "지역명 (예: 강원도, 경남, 창원시, 전주)",
				},
			},
			required: ["query"],
		},
	},
	{
		name: "get_weather",
		description: "지정 좌표의 현재 날씨(기온, 체감온도, WBGT, 강수 등)를 조회합니다",
		parameters: {
			type: Type.OBJECT,
			properties: {
				lat: { type: Type.NUMBER, description: "위도" },
				lng: { type: Type.NUMBER, description: "경도" },
			},
			required: ["lat", "lng"],
		},
	},
	{
		name: "get_air_quality",
		description: "지정 좌표 근처 측정소의 실시간 대기질(PM2.5, PM10, CAI 등)을 조회합니다",
		parameters: {
			type: Type.OBJECT,
			properties: {
				lat: { type: Type.NUMBER, description: "위도" },
				lng: { type: Type.NUMBER, description: "경도" },
			},
			required: ["lat", "lng"],
		},
	},
	{
		name: "get_life_index",
		description: "지정 좌표의 생활기상지수(자외선, 꽃가루, 식중독 등)를 조회합니다",
		parameters: {
			type: Type.OBJECT,
			properties: {
				lat: { type: Type.NUMBER, description: "위도" },
				lng: { type: Type.NUMBER, description: "경도" },
			},
			required: ["lat", "lng"],
		},
	},
	{
		name: "get_outdoor_score",
		description: "대기질·날씨·생활지수를 종합한 야외활동 적합도 점수(0~100)를 계산합니다",
		parameters: {
			type: Type.OBJECT,
			properties: {
				lat: { type: Type.NUMBER, description: "위도" },
				lng: { type: Type.NUMBER, description: "경도" },
				is_sensitive_group: { type: Type.BOOLEAN, description: "민감군 여부" },
			},
			required: ["lat", "lng", "is_sensitive_group"],
		},
	},
	{
		name: "get_places",
		description: "지정 좌표 주변의 관광지·문화시설·레포츠 장소를 조회합니다",
		parameters: {
			type: Type.OBJECT,
			properties: {
				lat: { type: Type.NUMBER, description: "위도" },
				lng: { type: Type.NUMBER, description: "경도" },
				type: {
					type: Type.STRING,
					description: "장소 유형: outdoor, indoor, all",
				},
				radius_km: { type: Type.NUMBER, description: "검색 반경(km), 기본값 5" },
			},
			required: ["lat", "lng"],
		},
	},
	{
		name: "get_festivals",
		description:
			"축제·공연·행사를 조회합니다. 좌표(lat, lng) 또는 지역코드(area_code, sigungu_code) 중 하나를 사용하세요. 지역코드는 get_area_code로 조회할 수 있습니다.",
		parameters: {
			type: Type.OBJECT,
			properties: {
				lat: { type: Type.NUMBER, description: "위도 (좌표 기반 검색 시)" },
				lng: { type: Type.NUMBER, description: "경도 (좌표 기반 검색 시)" },
				area_code: { type: Type.STRING, description: "시/도 지역코드" },
				sigungu_code: { type: Type.STRING, description: "시/군/구 지역코드" },
			},
		},
	},
];

async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
	if (name === "get_coordinates") {
		const query = args.query as string;
		const result = await searchAddress(query);
		if (!result) return { error: `"${query}"에 대한 좌표를 찾을 수 없습니다` };
		return result;
	}

	if (name === "get_area_code") {
		const query = args.query as string;
		const result = resolveAreaCode(query);
		if (!result) return { error: `"${query}"에 대한 지역코드를 찾을 수 없습니다` };
		return result;
	}

	const lat = Number(args.lat);
	const lng = Number(args.lng);

	switch (name) {
		case "get_weather":
		case "get_air_quality":
		case "get_life_index":
		case "get_outdoor_score":
		case "get_places":
			if (Number.isNaN(lat) || Number.isNaN(lng))
				return { error: `${name}에 유효한 lat/lng가 필요합니다` };
			break;
	}

	switch (name) {
		case "get_weather":
			return fetchWeather(lat, lng);
		case "get_air_quality":
			return fetchAirQuality(findNearestStation(lat, lng));
		case "get_life_index":
			return fetchLifeIndex(toAreaNo(lat, lng));
		case "get_outdoor_score": {
			const [weather, air, lifeIndex] = await Promise.all([
				fetchWeather(lat, lng),
				fetchAirQuality(findNearestStation(lat, lng)),
				fetchLifeIndex(toAreaNo(lat, lng)),
			]);
			return calculateOutdoorScore({
				air,
				weather,
				lifeIndex,
				isSensitiveGroup: (args.is_sensitive_group as boolean) ?? false,
			});
		}
		case "get_places":
			return fetchPlaces(
				lat,
				lng,
				(args.radius_km as number) ?? 5,
				((args.type as string) ?? "all") as "outdoor" | "indoor" | "all",
			);
		case "get_festivals":
			return fetchFestivals({
				lat: Number.isNaN(lat) ? undefined : lat,
				lng: Number.isNaN(lng) ? undefined : lng,
				areaCode: args.area_code as string | undefined,
				sigunguCode: args.sigungu_code as string | undefined,
			});
		default:
			return { error: `알 수 없는 도구: ${name}` };
	}
}

export interface AskGeminiInput {
	question: string;
	lat: number;
	lng: number;
	isSensitiveGroup: boolean;
}

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

const responseSchema = zodToJsonSchema(aiRecommendationSchema as unknown as ZodType, {
	target: "openApi3",
});

const MAX_TOOL_ROUNDS = 5;
const MAX_RETRIES = 3;

async function sendWithRetry(
	chat: ReturnType<typeof ai.chats.create>,
	message: Parameters<typeof chat.sendMessage>[0],
) {
	for (let attempt = 0; ; attempt++) {
		try {
			return await chat.sendMessage(message);
		} catch (e) {
			if (attempt >= MAX_RETRIES || !(e instanceof Error) || !e.message.includes("429")) throw e;
			const match = e.message.match(/retry in ([\d.]+)s/i);
			const delay = match ? Math.ceil(Number(match[1])) * 1000 + 2000 : 60_000;
			console.log(
				`[Gemini] 429 rate limit — ${Math.round(delay / 1000)}초 후 재시도 (${attempt + 1}/${MAX_RETRIES})`,
			);
			await new Promise((r) => setTimeout(r, delay));
		}
	}
}

export async function askGemini(input: AskGeminiInput): Promise<AIRecommendation> {
	const chat = ai.chats.create({
		model: "gemini-3.1-flash-lite-preview",
		config: {
			systemInstruction: SYSTEM_INSTRUCTION,
			tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
			maxOutputTokens: 2048,
			responseMimeType: "application/json",
			responseSchema,
		},
	});

	const prompt = `사용자 위치: 위도 ${input.lat}, 경도 ${input.lng}
민감군 여부: ${input.isSensitiveGroup ? "예" : "아니오"}

질문: ${input.question}`;

	console.log("[Gemini] 질문:", input.question);
	let result = await sendWithRetry(chat, { message: prompt });

	for (let i = 0; i < MAX_TOOL_ROUNDS; i++) {
		const calls = result.functionCalls;
		if (!calls?.length) break;

		console.log(`[Gemini] Round ${i + 1} — tool 호출:`, calls.map((c) => c.name).join(", "));

		const functionResponses = await Promise.all(
			calls.map(async (call) => {
				const args = (call.args ?? {}) as Record<string, unknown>;
				try {
					const toolResult = await executeTool(call.name ?? "", args);
					console.log(`[Gemini]   ✓ ${call.name}`, JSON.stringify(toolResult).slice(0, 200));
					return { name: call.name ?? "", response: { output: toolResult } };
				} catch (e) {
					const msg = e instanceof Error ? e.message : "unknown error";
					console.error(`[Gemini]   ✗ ${call.name} 실패:`, msg);
					return { name: call.name ?? "", response: { error: msg } };
				}
			}),
		);

		result = await sendWithRetry(chat, {
			message: functionResponses.map((fr) => ({ functionResponse: fr })),
		});
	}

	const calls = result.functionCalls;
	if (calls?.length) {
		console.warn(`[Gemini] MAX_TOOL_ROUNDS(${MAX_TOOL_ROUNDS}) 소진 — 강제 텍스트 요청`);
		result = await sendWithRetry(chat, {
			message: [
				{
					functionResponse: {
						name: calls[0].name ?? "",
						response: {
							error: "도구 호출 횟수 초과. 현재까지 수집된 데이터로 최종 JSON 응답을 생성하세요.",
						},
					},
				},
			],
		});
	}

	const text = result.text ?? "";
	console.log("[Gemini] 최종 응답:", text.slice(0, 300));

	return JSON.parse(text) as AIRecommendation;
}
