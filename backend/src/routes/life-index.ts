import { Hono } from "hono";
import type { ApiResponse, LifeIndex } from "shared";
import { cacheGet, cacheSet } from "../lib/cache.js";
import { toAreaNo } from "../services/geo.js";
import { fetchLifeIndex } from "../services/life-index.js";

export const lifeIndexRoute = new Hono();

lifeIndexRoute.get("/", async (c) => {
	const lat = c.req.query("lat");
	const lng = c.req.query("lng");
	const areaNo =
		c.req.query("areaNo") ?? (lat && lng ? toAreaNo(Number(lat), Number(lng)) : "1100000000");

	try {
		const cacheKey = `life:${areaNo}`;
		const cached = await cacheGet<LifeIndex>(cacheKey);
		if (cached) {
			return c.json<ApiResponse<LifeIndex>>({
				success: true,
				data: cached,
				cachedAt: new Date().toISOString(),
			});
		}

		const data = await fetchLifeIndex(areaNo);
		await cacheSet(cacheKey, data);
		return c.json<ApiResponse<LifeIndex>>({ success: true, data });
	} catch (e) {
		const message = e instanceof Error ? e.message : "알 수 없는 오류";
		return c.json<ApiResponse<never>>(
			{
				success: false,
				error: { code: "LIFE_INDEX_ERROR", message },
			},
			500,
		);
	}
});
