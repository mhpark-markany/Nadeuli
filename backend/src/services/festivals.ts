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
	firstimage?: string;
	tel?: string;
	eventstartdate: string;
	eventenddate: string;
}

interface FestivalApiResponse {
	response: {
		header: { resultCode: string };
		body: {
			items: { item: FestivalApiItem[] } | "";
			totalCount: number;
		};
	};
}

function todayStr(): string {
	const d = new Date();
	return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

export async function fetchFestivals(numOfRows = 30): Promise<Festival[]> {
	const url = buildDataGoKrUrl(BASE_URL, env.TOUR_API_KEY, {
		MobileOS: "ETC",
		MobileApp: "Nadeuli",
		_type: "json",
		eventStartDate: todayStr(),
		numOfRows: String(numOfRows),
		arrange: "Q",
	});

	const res = await fetch(url);
	const data = (await res.json()) as FestivalApiResponse;

	if (data.response.header.resultCode !== "0000") return [];
	const items = data.response.body.items;
	if (!items || typeof items === "string") return [];

	return items.item.map((item) => ({
		id: item.contentid,
		title: item.title,
		address: [item.addr1, item.addr2].filter(Boolean).join(" "),
		lat: Number(item.mapy) || 0,
		lng: Number(item.mapx) || 0,
		startDate: item.eventstartdate,
		endDate: item.eventenddate,
		tel: item.tel ?? undefined,
	}));
}
