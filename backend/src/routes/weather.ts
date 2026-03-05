import { Hono } from "hono";
import type { ApiResponse, DailyForecast, Weather } from "shared";
import { cacheGet, cacheSet } from "../lib/cache.js";
import { fetchWeather, fetchWeeklyForecast, toGrid } from "../services/weather.js";

export const weatherRoute = new Hono();

weatherRoute.get("/", async (c) => {
	const lat = Number(c.req.query("lat"));
	const lng = Number(c.req.query("lng"));

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
		const { nx, ny } = toGrid(lat, lng);
		const cacheKey = `weather:${nx}:${ny}`;
		const cached = await cacheGet<Weather>(cacheKey);
		if (cached) {
			return c.json<ApiResponse<Weather>>({
				success: true,
				data: cached,
				cachedAt: new Date().toISOString(),
			});
		}

		const data = await fetchWeather(lat, lng);
		await cacheSet(cacheKey, data);
		return c.json<ApiResponse<Weather>>({ success: true, data });
	} catch (e) {
		const message = e instanceof Error ? e.message : "알 수 없는 오류";
		return c.json<ApiResponse<never>>(
			{
				success: false,
				error: { code: "WEATHER_ERROR", message },
			},
			500,
		);
	}
});

weatherRoute.get("/weekly", async (c) => {
	const lat = Number(c.req.query("lat"));
	const lng = Number(c.req.query("lng"));

	if (!lat || !lng) {
		return c.json<ApiResponse<never>>(
			{ success: false, error: { code: "MISSING_PARAM", message: "lat, lng 필요" } },
			400,
		);
	}

	try {
		const { nx, ny } = toGrid(lat, lng);
		const cacheKey = `weekly:${nx}:${ny}`;
		const cached = await cacheGet<DailyForecast[]>(cacheKey);
		if (cached) {
			return c.json<ApiResponse<DailyForecast[]>>({
				success: true,
				data: cached,
				cachedAt: new Date().toISOString(),
			});
		}

		const data = await fetchWeeklyForecast(lat, lng);
		await cacheSet(cacheKey, data, 3600);
		return c.json<ApiResponse<DailyForecast[]>>({ success: true, data });
	} catch (e) {
		const message = e instanceof Error ? e.message : "알 수 없는 오류";
		return c.json<ApiResponse<never>>(
			{ success: false, error: { code: "WEATHER_ERROR", message } },
			500,
		);
	}
});
