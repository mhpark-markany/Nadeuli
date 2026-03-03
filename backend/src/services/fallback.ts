import type { AIRecommendation, AirQuality, OutdoorScore, Place, Weather } from "shared";

interface FallbackInput {
	air: AirQuality;
	weather: Weather;
	score: OutdoorScore;
	places: Place[];
	isSensitiveGroup: boolean;
}

export function generateFallback(input: FallbackInput): AIRecommendation {
	const { air, weather, score, places, isSensitiveGroup } = input;
	const pm25Threshold = isSensitiveGroup ? 30 : 36;
	const blocked = air.pm10Value >= 81 || air.pm25Value >= pm25Threshold;
	const indoorOnly = blocked || score.wbgtOverride;

	const indoorPlaces = places.filter((p) => [14, 39].includes(p.contentTypeId));
	const outdoorPlaces = places.filter((p) => [12, 28].includes(p.contentTypeId));
	const pool = indoorOnly ? indoorPlaces : [...outdoorPlaces, ...indoorPlaces];

	const activities = pool.slice(0, 3).map((p) => ({
		name: p.title,
		type: (indoorOnly || [14, 39].includes(p.contentTypeId) ? "indoor" : "outdoor") as
			| "indoor"
			| "outdoor",
		reason: indoorOnly
			? "현재 대기질/기온 조건상 실내 활동을 권장합니다"
			: "현재 조건에 적합한 장소입니다",
		placeId: p.contentId,
	}));

	const cautions: string[] = [];
	if (air.pm25Value >= 36) cautions.push(`PM2.5 ${air.pm25Value}㎍/㎥ — 미세먼지 나쁨 수준`);
	if (score.wbgtOverride) cautions.push(`온열지수(WBGT) ${weather.wbgt} — 열 스트레스 주의`);
	if (weather.precipitationType !== "없음") cautions.push("강수 예보가 있으니 우산을 챙기세요");

	const summary = indoorOnly
		? `현재 야외활동 적합도가 ${score.total}점으로 ${score.grade} 수준입니다. 실내 활동을 권장합니다.`
		: `현재 야외활동 적합도가 ${score.total}점으로 ${score.grade} 수준입니다. 야외 활동이 가능합니다.`;

	return {
		summary,
		bestTimeSlot: { start: "10:00", end: "12:00", reason: "일반적으로 오전이 대기질이 양호합니다" },
		activities,
		cautions,
		healthWarning: blocked
			? "질병관리청 가이드라인에 따라 현재 대기질 수준에서는 실내 활동을 권장합니다"
			: undefined,
	};
}
