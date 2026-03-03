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

// ── 축제 (전국축제표준데이터) ──

export interface Festival {
	id: string;
	title: string;
	address: string;
	lat: number;
	lng: number;
	startDate: string;
	endDate: string;
	description?: string;
	tel?: string;
}

// ── AI 추천 (Gemini) ──

export interface AIRecommendation {
	summary: string;
	bestTimeSlot: { start: string; end: string; reason: string };
	activities: Array<{
		name: string;
		type: "outdoor" | "indoor";
		reason: string;
		placeId?: string;
	}>;
	cautions: string[];
	healthWarning?: string;
}

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
}
