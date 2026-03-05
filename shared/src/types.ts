// ── 대기질 (에어코리아) ──

export type AirGrade = 1 | 2 | 3 | 4; // 좋음/보통/나쁨/매우나쁨
export type CaiGrade = "좋음" | "보통" | "나쁨" | "매우나쁨";

export interface AirQuality {
	stationName: string;
	pm25Value: number;
	pm25Grade: AirGrade;
	pm10Value: number;
	pm10Grade: AirGrade;
	o3Value: number;
	o3Grade: AirGrade;
	cai: number; // 0~500
	caiGrade: CaiGrade;
	dataTime: string;
}

// ── 날씨 (기상청) ──

export type Sky = "맑음" | "구름많음" | "흐림";
export type PrecipitationType = "없음" | "비" | "비/눈" | "눈";
export type WbgtGrade = "안전" | "주의" | "경계" | "위험" | "매우위험";

export interface Weather {
	temperature: number;
	humidity: number;
	windSpeed: number;
	precipitation: number;
	sky: Sky;
	precipitationType: PrecipitationType;
	feelsLike: number;
	wbgt: number;
	wbgtGrade: WbgtGrade;
	discomfortIndex: number;
}

// ── 생활기상지수 ──

export interface LifeIndex {
	uvIndex: number;
	uvGrade: string;
	pollenRisk?: number;
	airStagnation?: number;
	foodPoisoning?: number;
}

// ── 적합도 점수 ──

export type ScoreGrade = "최적" | "좋음" | "보통" | "주의" | "위험";

export interface HourlyScore {
	hour: number;
	score: number;
	grade: ScoreGrade;
}

export interface OutdoorScore {
	total: number; // 0~100
	airQualityScore: number;
	weatherScore: number;
	uvScore: number;
	seasonalPenalty: number;
	wbgtOverride: boolean;
	healthBlockActive: boolean;
	grade: ScoreGrade;
	hourlyForecast: HourlyScore[];
}

// ── 일별 예보 (주간예보용) ──

export interface DailyForecast {
	date: string; // YYYYMMDD
	minTemp: number;
	maxTemp: number;
	sky: Sky;
	precipitationType: PrecipitationType;
	pop: number; // 강수확률 %
}

// ── 사용자 프로필 ──

export type HealthCondition = "asthma" | "allergy" | "heart" | "elderly" | "respiratory";
export type Companion = "infant" | "child" | "pet" | "elderly";

export interface UserProfile {
	healthConditions: HealthCondition[];
	companions: Companion[];
	isSensitiveGroup: boolean;
	preferredActivities: Array<"hiking" | "cycling" | "walking" | "picnic">;
}

// ── 장소 (TourAPI) ──

export type PlaceType = "outdoor" | "indoor" | "all";

export interface Place {
	contentId: string;
	title: string;
	address: string;
	lat: number;
	lng: number;
	distance: number; // km
	contentTypeId: number; // 12=관광지, 14=문화시설, 28=레포츠, 39=음식점
	imageUrl?: string;
	tel?: string;
}

// ── 축제 (위치 기반 행사) ──

export interface Festival {
	id: string;
	title: string;
	address: string;
	lat: number;
	lng: number;
	startDate: string;
	endDate: string;
	distance?: number; // km
	image?: string; // 대표 이미지 URL
	fee?: string; // 이용 요금 (예: "무료", "성인 5,000원")
}

// ── AI 추천 (Gemini) ──

import { z } from "zod";

export const aiRecommendationSchema = z.object({
	summary: z.string(),
	weather: z
		.object({
			temp: z.number(),
			feelsLike: z.number(),
			sky: z.string(),
			humidity: z.number(),
			wbgt: z.number().nullable(),
			description: z.string(),
		})
		.nullable(),
	airQuality: z
		.object({
			pm25: z.number(),
			pm10: z.number(),
			caiGrade: z.string(),
			description: z.string(),
		})
		.nullable(),
	timeSlots: z.array(
		z.object({
			start: z.string(),
			end: z.string(),
			reason: z.string(),
		}),
	),
	activities: z.array(
		z.object({
			name: z.string(),
			type: z.enum(["outdoor", "indoor"]),
			reason: z.string(),
			placeName: z.string().nullable(),
		}),
	),
	cautions: z.array(z.string()),
	healthWarning: z.string().nullable(),
});

export type AIRecommendation = z.infer<typeof aiRecommendationSchema>;

export interface AskRequest {
	question: string;
	profile?: UserProfile;
	location: { lat: number; lng: number };
}

export interface AskResponse {
	recommendation: AIRecommendation;
	cached: boolean;
}

// ── API 응답 래퍼 ──

export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: { code: string; message: string };
	cachedAt?: string;
}

// ── 대시보드 통합 응답 ──

export interface DashboardData {
	airQuality: AirQuality;
	weather: Weather;
	lifeIndex: LifeIndex;
	score: OutdoorScore;
	weeklyForecast?: DailyForecast[];
}
