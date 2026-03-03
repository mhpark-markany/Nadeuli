import { Hono } from "hono";
import { env } from "../lib/env.js";

export const geocodeRoute = new Hono();

interface KakaoRegion {
	region_1depth_name: string;
	region_2depth_name: string;
	region_3depth_name: string;
}

interface KakaoResponse {
	documents: KakaoRegion[];
}

geocodeRoute.get("/", async (c) => {
	const lat = c.req.query("lat");
	const lng = c.req.query("lng");

	if (!lat || !lng) {
		return c.json({ success: false, error: { message: "lat, lng 필수" } }, 400);
	}

	const url = `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${lng}&y=${lat}`;
	const res = await fetch(url, {
		headers: { Authorization: `KakaoAK ${env.KAKAO_REST_API_KEY}` },
	});

	if (!res.ok) {
		return c.json({ success: false, error: { message: "카카오 API 오류" } }, 502);
	}

	const data = (await res.json()) as KakaoResponse;
	const region = data.documents[0];

	if (!region) {
		return c.json({ success: false, error: { message: "주소를 찾을 수 없음" } }, 404);
	}

	const address = [region.region_1depth_name, region.region_2depth_name, region.region_3depth_name]
		.filter(Boolean)
		.join(" ");

	return c.json({
		success: true,
		data: {
			address,
			sido: region.region_1depth_name,
			sigungu: region.region_2depth_name,
			dong: region.region_3depth_name,
		},
	});
});
