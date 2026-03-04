import { Hono } from "hono";
import type { AirQuality, ApiResponse } from "shared";
import { cacheGet, cacheSet } from "../lib/cache.js";
import { fetchAirQuality, findNearestStation } from "../services/air-quality.js";

export const airQualityRoute = new Hono();

airQualityRoute.get("/", async (c) => {
	const lat = c.req.query("lat");
	const lng = c.req.query("lng");
	const station = c.req.query("station");

	try {
		let stationName = station ?? "";
		if (!stationName && lat && lng) {
			stationName = findNearestStation(Number(lat), Number(lng));
		}
		if (!stationName) {
			return c.json<ApiResponse<never>>(
				{
					success: false,
					error: { code: "MISSING_PARAM", message: "lat/lng 또는 station 필요" },
				},
				400,
			);
		}

		const cacheKey = `air:${stationName}`;
		const cached = await cacheGet<AirQuality>(cacheKey);
		if (cached) {
			return c.json<ApiResponse<AirQuality>>({
				success: true,
				data: cached,
				cachedAt: new Date().toISOString(),
			});
		}

		const data = await fetchAirQuality(stationName);
		await cacheSet(cacheKey, data);
		return c.json<ApiResponse<AirQuality>>({ success: true, data });
	} catch (e) {
		const message = e instanceof Error ? e.message : "알 수 없는 오류";
		return c.json<ApiResponse<never>>(
			{
				success: false,
				error: { code: "AIR_QUALITY_ERROR", message },
			},
			500,
		);
	}
});
