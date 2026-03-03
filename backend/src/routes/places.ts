import { Hono } from "hono";
import type { ApiResponse, Place, PlaceType } from "shared";
import { cacheGet, cacheSet } from "../lib/cache.js";
import { fetchPlaces } from "../services/places.js";

export const placesRoute = new Hono();

const CACHE_TTL = 86400; // 24시간

placesRoute.get("/", async (c) => {
	const lat = Number(c.req.query("lat"));
	const lng = Number(c.req.query("lng"));
	const radius = Number(c.req.query("radius") || "5");
	const type = (c.req.query("type") || "all") as PlaceType;

	if (!lat || !lng) {
		return c.json<ApiResponse<never>>(
			{ success: false, error: { code: "MISSING_PARAM", message: "lat, lng 필요" } },
			400,
		);
	}

	try {
		const cacheKey = `places:${lat.toFixed(2)}:${lng.toFixed(2)}:${radius}:${type}`;
		const cached = await cacheGet<Place[]>(cacheKey);
		if (cached) {
			return c.json<ApiResponse<Place[]>>({
				success: true,
				data: cached,
				cachedAt: new Date().toISOString(),
			});
		}

		const data = await fetchPlaces(lat, lng, radius, type);
		await cacheSet(cacheKey, data, CACHE_TTL);
		return c.json<ApiResponse<Place[]>>({ success: true, data });
	} catch (e) {
		const message = e instanceof Error ? e.message : "알 수 없는 오류";
		return c.json<ApiResponse<never>>(
			{ success: false, error: { code: "PLACES_ERROR", message } },
			500,
		);
	}
});
