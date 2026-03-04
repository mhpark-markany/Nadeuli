import { Hono } from "hono";
import type { ApiResponse, Festival } from "shared";
import { cacheGet, cacheSet } from "../lib/cache.js";
import { fetchFestivals } from "../services/festivals.js";

export const festivalsRoute = new Hono();

const CACHE_TTL = 3600; // 1시간

festivalsRoute.get("/", async (c) => {
	const lat = c.req.query("lat");
	const lng = c.req.query("lng");

	if (!lat || !lng) {
		return c.json<ApiResponse<never>>(
			{ success: false, error: { code: "MISSING_PARAM", message: "lat, lng 필수" } },
			400,
		);
	}

	try {
		const cacheKey = `festivals:${Number(lat).toFixed(1)}:${Number(lng).toFixed(1)}`;
		const cached = await cacheGet<Festival[]>(cacheKey);
		if (cached) {
			return c.json<ApiResponse<Festival[]>>({ success: true, data: cached });
		}

		const data = await fetchFestivals({ lat: Number(lat), lng: Number(lng) });
		await cacheSet(cacheKey, data, CACHE_TTL);
		return c.json<ApiResponse<Festival[]>>({ success: true, data });
	} catch (e) {
		const message = e instanceof Error ? e.message : "알 수 없는 오류";
		return c.json<ApiResponse<never>>(
			{ success: false, error: { code: "FESTIVALS_ERROR", message } },
			500,
		);
	}
});
