import { Hono } from "hono";
import type { ApiResponse, Festival } from "shared";
import { cacheGet, cacheSet } from "../lib/cache.js";
import { fetchFestivals } from "../services/festivals.js";

export const festivalsRoute = new Hono();

const CACHE_TTL = 86400; // 24시간

festivalsRoute.get("/", async (c) => {
	try {
		const cacheKey = "festivals";
		const cached = await cacheGet<Festival[]>(cacheKey);
		if (cached) {
			return c.json<ApiResponse<Festival[]>>({
				success: true,
				data: cached,
				cachedAt: new Date().toISOString(),
			});
		}

		const data = await fetchFestivals();
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
