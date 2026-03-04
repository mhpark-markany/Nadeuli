import type { AirQuality, Weather } from "shared";

const DEFAULT = [
	"상쾌한",
	"쾌적한",
	"화창한",
	"산뜻한",
	"똑똑한",
	"완벽한",
	"안전한",
	"설레는",
	"가벼운",
	"건강한",
];

const SEASON = {
	spring: ["따스한", "화사한", "포근한", "향긋한", "봄바람"],
	summer: ["시원한", "청량한", "눈부신", "경쾌한", "푸르른"],
	autumn: ["선선한", "청명한", "낭만적", "차분한", "단풍길"],
	winter: ["따뜻한", "포근한", "새하얀", "온화한", "눈꽃길"],
} as const;

const WEATHER = {
	sunny: ["화창한", "해맑은", "산뜻한", "쾌적한", "맑은날"],
	rainy: ["촉촉한", "차분한", "감성적", "빗속의", "고요한"],
	snowy: ["소복한", "새하얀", "낭만적", "설레는", "포근한"],
	badAir: ["안전한", "건강한", "똑똑한", "실내로", "꼼꼼한"],
} as const;

type Season = keyof typeof SEASON;

const MONTH_TO_SEASON: Record<number, Season> = {
	3: "spring",
	4: "spring",
	5: "spring",
	6: "summer",
	7: "summer",
	8: "summer",
	9: "autumn",
	10: "autumn",
	11: "autumn",
	12: "winter",
	1: "winter",
	2: "winter",
};

export function selectTitles(weather?: Weather, airQuality?: AirQuality): string[] {
	if (!weather || !airQuality) return DEFAULT;

	if (airQuality.pm10Value >= 81 || airQuality.pm25Value >= 36) return [...WEATHER.badAir];
	if (weather.precipitationType === "비" || weather.precipitationType === "비/눈")
		return [...WEATHER.rainy];
	if (weather.precipitationType === "눈") return [...WEATHER.snowy];
	if (weather.sky === "맑음") return [...WEATHER.sunny];

	const season = MONTH_TO_SEASON[new Date().getMonth() + 1];
	return [...SEASON[season]];
}
