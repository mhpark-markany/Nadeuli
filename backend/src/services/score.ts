import type {
	AirQuality,
	HourlyScore,
	LifeIndex,
	OutdoorScore,
	PrecipitationType,
	ScoreGrade,
	Sky,
	Weather,
} from "shared";
import { nowKST } from "../lib/kst.js";
import type { HourlyWeather } from "./weather.js";

interface ScoreInput {
	air: AirQuality;
	weather: Weather;
	lifeIndex: LifeIndex;
	isSensitiveGroup?: boolean;
	hourlyWeather?: HourlyWeather[];
}

// ── 메인 산출 함수 ──

export function calculateOutdoorScore(input: ScoreInput): OutdoorScore {
	const { air, weather, lifeIndex, isSensitiveGroup = false, hourlyWeather = [] } = input;

	// [1단계] 개별 점수 산출
	const airScore = caiToScore(air.cai);
	const weatherScore = calcWeatherScore(weather, hourlyWeather);
	const uvScore = calcUVScore(lifeIndex.uvIndex);
	const seasonalScore = calcSeasonalScore(lifeIndex);

	// [2단계] 기본 점수 = 가중 합산
	let total = airScore * 0.45 + weatherScore * 0.3 + uvScore * 0.12 + seasonalScore * 0.13;

	// [3단계] WBGT 강제 오버라이드
	let wbgtOverride = false;
	const wbgt = weather.wbgt;
	if (wbgt > 21 && wbgt <= 25) {
		total *= 0.9;
	} else if (wbgt > 25 && wbgt <= 28) {
		total *= 0.7;
	} else if (wbgt > 28 && wbgt <= 31) {
		total = Math.min(total, 49);
		wbgtOverride = true;
	} else if (wbgt > 31) {
		total = Math.min(total, 20);
		wbgtOverride = true;
	}

	// [4단계] 보건 가이드라인 강제 차단
	const pm25Threshold = isSensitiveGroup ? 30 : 36;
	const healthBlockActive = air.pm10Value >= 81 || air.pm25Value >= pm25Threshold;

	// [5단계] 계절성 페널티 (곱연산자)
	const month = nowKST().getMonth() + 1;
	let seasonalPenalty = 1.0;

	if ([4, 5, 8, 9, 10].includes(month) && lifeIndex.pollenRisk != null) {
		if (lifeIndex.pollenRisk >= 3) seasonalPenalty *= 0.85;
	}
	if ([6, 7, 8].includes(month)) {
		if (weather.discomfortIndex >= 80) seasonalPenalty *= 0.9;
		if (lifeIndex.foodPoisoning != null && lifeIndex.foodPoisoning >= 70) {
			seasonalPenalty *= 0.95;
		}
	}
	if (lifeIndex.airStagnation != null && lifeIndex.airStagnation >= 75) {
		seasonalPenalty *= 0.9;
	}

	total = Math.round(Math.max(0, Math.min(100, total * seasonalPenalty)));

	return {
		total,
		airQualityScore: Math.round(airScore),
		weatherScore: Math.round(weatherScore),
		uvScore: Math.round(uvScore),
		seasonalPenalty: Math.round((1 - seasonalPenalty) * 100),
		wbgtOverride,
		healthBlockActive,
		grade: scoreToGrade(total),
		hourlyForecast: calcHourlyScores(hourlyWeather, airScore),
	};
}

// ── CAI → 대기질 점수 ──

function caiToScore(cai: number): number {
	if (cai <= 50) return 100;
	if (cai <= 100) return 70;
	if (cai <= 250) return 30;
	return 0;
}

// ── 기상 점수 (기온 쾌적도 + 강수 + 풍속) ──

function calcWeatherScore(w: Weather, hourlyWeather: HourlyWeather[]): number {
	let score = 100;

	// 기온 쾌적도 (18~25°C 최적)
	const temp = w.temperature;
	if (temp < 0) score -= 40;
	else if (temp < 10) score -= 20;
	else if (temp < 18) score -= 5;
	else if (temp > 33) score -= 40;
	else if (temp > 28) score -= 15;

	// 강수
	if (w.precipitationType !== "없음") score -= 30;
	if (w.precipitation > 5) score -= 20;

	// 오늘 강수확률 최대값 반영 (현재 안 오더라도 올 예정이면 감점)
	const maxPop = hourlyWeather.reduce((max, h) => Math.max(max, h.pop), 0);
	if (maxPop >= 70) score -= 20;
	else if (maxPop >= 50) score -= 10;

	// 풍속 (10m/s 이상 감점)
	if (w.windSpeed > 14) score -= 30;
	else if (w.windSpeed > 10) score -= 15;

	return Math.max(0, score);
}

// ── 자외선 점수 ──

function calcUVScore(uv: number): number {
	if (uv <= 2) return 100;
	if (uv <= 5) return 80;
	if (uv <= 7) return 55;
	if (uv <= 10) return 30;
	return 10;
}

// ── 계절성 기본 점수 (생활기상지수 기반) ──

function calcSeasonalScore(li: LifeIndex): number {
	let score = 100;
	if (li.pollenRisk != null && li.pollenRisk >= 3) score -= 20;
	if (li.airStagnation != null && li.airStagnation >= 75) score -= 15;
	if (li.foodPoisoning != null && li.foodPoisoning >= 70) score -= 10;
	return Math.max(0, score);
}

// ── 점수 → 등급 ──

function scoreToGrade(score: number): ScoreGrade {
	if (score >= 80) return "최적";
	if (score >= 60) return "좋음";
	if (score >= 40) return "보통";
	if (score >= 20) return "주의";
	return "위험";
}

// ── 시간대별 점수 산출 ──

function calcHourlyScores(hourly: HourlyWeather[], airScore: number): HourlyScore[] {
	return hourly.map((h) => {
		let ws = 100;
		// 기온
		if (h.temp < 0) ws -= 40;
		else if (h.temp < 10) ws -= 20;
		else if (h.temp < 18) ws -= 5;
		else if (h.temp > 33) ws -= 40;
		else if (h.temp > 28) ws -= 15;
		// 강수
		if (h.pty > 0) ws -= 30;
		if (h.pop >= 60) ws -= 15;
		// 풍속
		if (h.wsd > 14) ws -= 30;
		else if (h.wsd > 10) ws -= 15;
		// 하늘
		if (h.sky === 4) ws -= 5;

		const score = Math.round(Math.max(0, Math.min(100, airScore * 0.45 + Math.max(0, ws) * 0.55)));
		const sky: Sky = h.sky === 4 ? "흐림" : h.sky === 3 ? "구름많음" : "맑음";
		const precipitationType: PrecipitationType =
			h.pty === 1 ? "비" : h.pty === 2 ? "비/눈" : h.pty === 3 ? "눈" : "없음";
		return { hour: h.hour, score, grade: scoreToGrade(score), sky, precipitationType };
	});
}
