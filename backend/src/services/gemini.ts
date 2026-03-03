import {
	type FunctionDeclarationsTool,
	GoogleGenerativeAI,
	SchemaType,
} from "@google/generative-ai";
import type { AIRecommendation } from "shared";
import { env } from "../lib/env.js";
import { fetchAirQuality, findNearestStation } from "./air-quality.js";
import { fetchFestivals } from "./festivals.js";
import { toAreaNo } from "./geo.js";
import { fetchLifeIndex } from "./life-index.js";
import { fetchPlaces } from "./places.js";
import { calculateOutdoorScore } from "./score.js";
import { fetchWeather } from "./weather.js";

const SYSTEM_INSTRUCTION = `당신은 대기질·날씨 기반 야외활동 추천 전문가입니다.

## 규칙
1. 사용자 질문에 필요한 데이터를 도구(function)를 호출하여 수집할 것
2. 반드시 도구로 가져온 실제 데이터만 사용할 것 (환각 금지)
3. 장소 추천 시 get_places로 가져온 장소만 추천할 것
4. 응답은 마크다운이 아닌 순수 JSON 구조로만 반환할 것
5. 한국어로 답변할 것

## 보건 가이드라인 (강제)
- PM10 ≥ 81㎍/㎥ 또는 PM2.5 ≥ 36㎍/㎥ → 야외 활동 추천 차단, 실내 시설만 추천
- 민감군(어린이, 노인, 폐질환/심장질환자) 프로필 시 → PM2.5 ≥ 30㎍/㎥에서도 실내만 추천
- 위반 시 "질병관리청 가이드라인에 따라 호흡기 질환 동반자의 건강을 위해 실내 활동으로 일정을 대체할 것을 권장합니다" 경고 포함

## 대기질 등급 (통합대기환경지수 CAI)
- 0~50: 좋음 / 51~100: 보통 / 101~250: 나쁨 / 251~500: 매우나쁨

## 온열지수(WBGT)
- ≤21: 안전 / 21~25: 주의 / 25~28: 경계 / 28~31: 위험(실내만) / ≥31: 매우위험(외출자제)

## JSON 응답 형식
{
  "summary": "종합 판단 (2~3문장)",
  "bestTimeSlot": { "start": "HH:MM", "end": "HH:MM", "reason": "이유" },
  "activities": [{ "name": "활동명", "type": "outdoor|indoor", "reason": "이유", "placeId": "TourAPI contentId (있으면)" }],
  "cautions": ["주의사항1", "주의사항2"],
  "healthWarning": "민감군 경고 (해당 시에만)"
}`;

const TOOLS: FunctionDeclarationsTool[] = [
	{
		functionDeclarations: [
			{
				name: "get_weather",
				description: "지정 좌표의 현재 날씨(기온, 체감온도, WBGT, 강수 등)를 조회합니다",
				parameters: {
					type: SchemaType.OBJECT,
					properties: {
						lat: { type: SchemaType.NUMBER, description: "위도" },
						lng: { type: SchemaType.NUMBER, description: "경도" },
					},
					required: ["lat", "lng"],
				},
			},
			{
				name: "get_air_quality",
				description: "지정 좌표 근처 측정소의 실시간 대기질(PM2.5, PM10, CAI 등)을 조회합니다",
				parameters: {
					type: SchemaType.OBJECT,
					properties: {
						lat: { type: SchemaType.NUMBER, description: "위도" },
						lng: { type: SchemaType.NUMBER, description: "경도" },
					},
					required: ["lat", "lng"],
				},
			},
			{
				name: "get_life_index",
				description: "지정 좌표의 생활기상지수(자외선, 꽃가루, 식중독 등)를 조회합니다",
				parameters: {
					type: SchemaType.OBJECT,
					properties: {
						lat: { type: SchemaType.NUMBER, description: "위도" },
						lng: { type: SchemaType.NUMBER, description: "경도" },
					},
					required: ["lat", "lng"],
				},
			},
			{
				name: "get_outdoor_score",
				description: "대기질·날씨·생활지수를 종합한 야외활동 적합도 점수(0~100)를 계산합니다",
				parameters: {
					type: SchemaType.OBJECT,
					properties: {
						lat: { type: SchemaType.NUMBER, description: "위도" },
						lng: { type: SchemaType.NUMBER, description: "경도" },
						is_sensitive_group: { type: SchemaType.BOOLEAN, description: "민감군 여부" },
					},
					required: ["lat", "lng", "is_sensitive_group"],
				},
			},
			{
				name: "get_places",
				description: "지정 좌표 주변의 관광지·문화시설·레포츠 장소를 조회합니다",
				parameters: {
					type: SchemaType.OBJECT,
					properties: {
						lat: { type: SchemaType.NUMBER, description: "위도" },
						lng: { type: SchemaType.NUMBER, description: "경도" },
						type: {
							type: SchemaType.STRING,
							description: "장소 유형",
							format: "enum",
							enum: ["outdoor", "indoor", "all"],
						},
						radius_km: { type: SchemaType.NUMBER, description: "검색 반경(km), 기본값 5" },
					},
					required: ["lat", "lng"],
				},
			},
			{
				name: "get_festivals",
				description: "현재 진행 중이거나 예정된 전국 축제 목록을 조회합니다",
				parameters: { type: SchemaType.OBJECT, properties: {} },
			},
		],
	},
];

async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
	const lat = args.lat as number;
	const lng = args.lng as number;

	switch (name) {
		case "get_weather":
			return fetchWeather(lat, lng);
		case "get_air_quality":
			return fetchAirQuality(findNearestStation(0, 0, lat, lng));
		case "get_life_index":
			return fetchLifeIndex(toAreaNo(lat, lng));
		case "get_outdoor_score": {
			const [weather, air, lifeIndex] = await Promise.all([
				fetchWeather(lat, lng),
				fetchAirQuality(findNearestStation(0, 0, lat, lng)),
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
			return fetchFestivals();
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

const MAX_TOOL_ROUNDS = 5;

async function sendWithRetry(
	chat: ReturnType<ReturnType<GoogleGenerativeAI["getGenerativeModel"]>["startChat"]>,
	content: Parameters<typeof chat.sendMessage>[0],
) {
	try {
		return await chat.sendMessage(content);
	} catch (e) {
		if (e instanceof Error && e.message.includes("429")) {
			const match = e.message.match(/retry in ([\d.]+)s/i);
			const delay = match ? Math.ceil(Number(match[1])) * 1000 + 2000 : 60_000;
			console.log(`[Gemini] 429 rate limit — ${Math.round(delay / 1000)}초 후 재시도`);
			await new Promise((r) => setTimeout(r, delay));
			return await chat.sendMessage(content);
		}
		throw e;
	}
}

export async function askGemini(input: AskGeminiInput): Promise<AIRecommendation> {
	const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
	const model = genAI.getGenerativeModel({
		model: "gemini-3-flash-preview",
		systemInstruction: SYSTEM_INSTRUCTION,
		tools: TOOLS,
	});

	const chat = model.startChat();
	const prompt = `사용자 위치: 위도 ${input.lat}, 경도 ${input.lng}
민감군 여부: ${input.isSensitiveGroup ? "예" : "아니오"}

질문: ${input.question}`;

	console.log("[Gemini] 질문:", input.question);
	let result = await sendWithRetry(chat, prompt);

	for (let i = 0; i < MAX_TOOL_ROUNDS; i++) {
		const calls = result.response.functionCalls();
		if (!calls?.length) break;

		console.log(`[Gemini] Round ${i + 1} — tool 호출:`, calls.map((c) => c.name).join(", "));

		const responses = await Promise.all(
			calls.map(async (call) => {
				const args = call.args as Record<string, unknown>;
				try {
					const toolResult = await executeTool(call.name, args);
					console.log(`[Gemini]   ✓ ${call.name}`, JSON.stringify(toolResult).slice(0, 200));
					return { functionResponse: { name: call.name, response: { result: toolResult } } };
				} catch (e) {
					const msg = e instanceof Error ? e.message : "unknown error";
					console.error(`[Gemini]   ✗ ${call.name} 실패:`, msg);
					return { functionResponse: { name: call.name, response: { error: msg } } };
				}
			}),
		);

		result = await sendWithRetry(chat, responses);
	}

	const text = result.response.text();
	console.log("[Gemini] 최종 응답:", text.slice(0, 300));
	return JSON.parse(text) as AIRecommendation;
}
