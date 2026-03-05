import { type FunctionDeclaration, GoogleGenAI, Type } from "@google/genai";
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
- summary: 종합 판단. 야외활동과 무관한 질문에도 summary에 답변 작성

## 시간대별·주간 예보 활용
- 사용자가 특정 시간대(오늘 저녁, 내일 오전 등)를 언급하면 반드시 get_hourly_forecast로 해당 시간대의 기온·강수확률·하늘상태를 확인할 것
- "이번 주", "주말" 등 며칠에 걸친 질문은 get_weekly_forecast로 일별 예보를 확인할 것
- get_weather는 현재 관측값이므로, 미래 시점 질문에는 예보 데이터를 우선 참고할 것
- hourly forecast의 pop(강수확률)이 50% 이상이면 우산 지참 안내, 70% 이상이면 야외활동 주의 권고`;

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
	{
		name: "get_hourly_forecast",
		description:
			"지정 좌표의 시간대별 기상 예보(기온, 하늘상태, 강수형태, 강수확률, 풍속)를 조회합니다. 오늘 남은 시간~내일까지 제공됩니다. 사용자가 특정 시간대(오늘 저녁, 내일 오전 등)를 언급하면 반드시 호출하세요.",
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
		name: "get_weekly_forecast",
		description:
			"지정 좌표의 주간 일별 예보(최저/최고기온, 하늘상태, 강수형태, 강수확률)를 조회합니다. 오늘부터 7일간 제공됩니다. '이번 주', '주말', '내일모레' 등 며칠에 걸친 질문에 사용하세요.",
		parameters: {
			type: Type.OBJECT,
			properties: {
				lat: { type: Type.NUMBER, description: "위도" },
				lng: { type: Type.NUMBER, description: "경도" },
			},
			required: ["lat", "lng"],
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
		case "get_hourly_forecast":
		case "get_weekly_forecast":
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
			const [weather, air, lifeIndex, hourlyWeather] = await Promise.all([
				fetchWeather(lat, lng),
				fetchAirQuality(findNearestStation(lat, lng)),
				fetchLifeIndex(toAreaNo(lat, lng)),
				fetchHourlyForecast(lat, lng),
			]);
			return calculateOutdoorScore({
				air,
				weather,
				lifeIndex,
				isSensitiveGroup: (args.is_sensitive_group as boolean) ?? false,
				hourlyWeather,
			});
		}
		case "get_hourly_forecast":
			return fetchHourlyForecast(lat, lng);
		case "get_weekly_forecast":
			return fetchWeeklyForecast(lat, lng);
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

const responseSchema = {
	type: Type.OBJECT,
	properties: {
		summary: { type: Type.STRING, description: "종합 판단 또는 답변" },
		weather: {
			type: Type.OBJECT,
			nullable: true,
			description: "날씨 요약 (get_weather 결과 기반)",
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
			description: "대기질 요약 (get_air_quality 결과 기반)",
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
	},
	required: [
		"summary",
		"weather",
		"airQuality",
		"timeSlots",
		"activities",
		"cautions",
		"healthWarning",
	],
};

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
	// 1단계: 도구 호출용 채팅 (responseSchema 없이)
	const chat = ai.chats.create({
		model: "gemini-3-flash-preview",
		config: {
			systemInstruction: SYSTEM_INSTRUCTION,
			tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
			maxOutputTokens: 2048,
		},
	});

	const prompt = `사용자 위치: 위도 ${input.lat}, 경도 ${input.lng}
민감군 여부: ${input.isSensitiveGroup ? "예" : "아니오"}

질문: ${input.question}`;

	console.log("[Gemini] 질문:", input.question);
	let result = await sendWithRetry(chat, { message: prompt });

	const toolResults: Record<string, unknown> = {};

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
					toolResults[call.name ?? ""] = toolResult;
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

	// 2단계: 수집된 데이터로 구조화된 응답 생성 (tools 없이, responseSchema 적용)
	const structured = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: `${SYSTEM_INSTRUCTION}

## 사용자 질문
${prompt}

## 수집된 데이터
${JSON.stringify(toolResults, null, 2)}

위 데이터를 기반으로 응답을 생성하세요.`,
		config: {
			maxOutputTokens: 2048,
			responseMimeType: "application/json",
			responseSchema,
		},
	});

	const text = structured.text ?? "";
	console.log("[Gemini] 최종 응답:", text);

	return JSON.parse(text) as AIRecommendation;
}
