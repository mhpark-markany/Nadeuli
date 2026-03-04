import { Hono } from "hono";
import type { ApiResponse, OutdoorScore } from "shared";
import { fetchAirQuality, findNearestStation } from "../services/air-quality.js";
import { toAreaNo } from "../services/geo.js";
import { fetchLifeIndex } from "../services/life-index.js";
import { calculateOutdoorScore } from "../services/score.js";
import { fetchHourlyForecast, fetchWeather } from "../services/weather.js";

export const scoreRoute = new Hono();

scoreRoute.get("/", async (c) => {
	const lat = Number(c.req.query("lat"));
	const lng = Number(c.req.query("lng"));
	const sensitive = c.req.query("sensitive") === "true";

	if (!lat || !lng) {
		return c.json<ApiResponse<never>>(
			{
				success: false,
				error: { code: "MISSING_PARAM", message: "lat, lng 필요" },
			},
			400,
		);
	}

	try {
		const areaNo = toAreaNo(lat, lng);
		const stationName = findNearestStation(lat, lng);

		const [weather, lifeIndex, hourlyWeather] = await Promise.all([
			fetchWeather(lat, lng),
			fetchLifeIndex(areaNo),
			fetchHourlyForecast(lat, lng),
		]);

		const air = await fetchAirQuality(stationName);

		const score = calculateOutdoorScore({
			air,
			weather,
			lifeIndex,
			isSensitiveGroup: sensitive,
			hourlyWeather,
		});

		return c.json<ApiResponse<OutdoorScore>>({ success: true, data: score });
	} catch (e) {
		const message = e instanceof Error ? e.message : "알 수 없는 오류";
		return c.json<ApiResponse<never>>(
			{
				success: false,
				error: { code: "SCORE_ERROR", message },
			},
			500,
		);
	}
});
