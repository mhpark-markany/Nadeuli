import type { Festival } from "shared";
import { buildDataGoKrUrl } from "../lib/api-url.js";
import { env } from "../lib/env.js";

const BASE_URL = "http://apis.data.go.kr/B551011/KorService2/searchFestival2";

interface FestivalApiItem {
	contentid: string;
	title: string;
	addr1: string;
	addr2?: string;
	mapx: string;
	mapy: string;
	tel?: string;
	eventstartdate: string;
	eventenddate: string;
}

interface FestivalApiResponse {
	response: {
		header: { resultCode: string };
		body: {
			items: { item: FestivalApiItem | FestivalApiItem[] } | "";
		};
	};
}

function todayStr(): string {
	const d = new Date();
	return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const R = 6371;
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLng = ((lng2 - lng1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function fetchFestivals(
	lat: number,
	lng: number,
	radiusKm = 50,
	limit = 10,
): Promise<Festival[]> {
	const url = buildDataGoKrUrl(BASE_URL, env.TOUR_API_KEY, {
		MobileOS: "ETC",
		MobileApp: "Nadeuli",
		_type: "json",
		eventStartDate: todayStr(),
		numOfRows: "100",
		arrange: "Q",
	});

	const res = await fetch(url);
	const data = (await res.json()) as FestivalApiResponse;

	if (data.response.header.resultCode !== "0000") return [];
	const items = data.response.body.items;
	if (!items || typeof items === "string") return [];

	const itemArray = Array.isArray(items.item) ? items.item : [items.item];

	return itemArray
		.map((item) => {
			const itemLat = Number(item.mapy) || 0;
			const itemLng = Number(item.mapx) || 0;
			const distance = calcDistance(lat, lng, itemLat, itemLng);
			return {
				id: item.contentid,
				title: item.title,
				address: [item.addr1, item.addr2].filter(Boolean).join(" "),
				lat: itemLat,
				lng: itemLng,
				startDate: item.eventstartdate,
				endDate: item.eventenddate,
				distance: Math.round(distance * 10) / 10,
			};
		})
		.filter((f) => f.distance <= radiusKm)
		.sort((a, b) => a.distance - b.distance)
		.slice(0, limit);
}
