import type { Place, PlaceType } from "shared";
import { buildDataGoKrUrl } from "../lib/api-url.js";
import { env } from "../lib/env.js";

const BASE_URL = "http://apis.data.go.kr/B551011/KorService2";

// contentTypeId: 관광지(12), 문화시설(14), 레포츠(28)
const OUTDOOR_TYPES = [12, 28];
const INDOOR_TYPES = [14];

interface TourApiItem {
	contentid: string;
	title: string;
	addr1: string;
	addr2?: string;
	mapx: string; // 경도
	mapy: string; // 위도
	dist: string; // 거리(m)
	contenttypeid: string;
	firstimage?: string;
	tel?: string;
}

interface TourApiResponse {
	response: {
		header: { resultCode: string };
		body: {
			items: { item: TourApiItem[] } | "";
			totalCount: number;
		};
	};
}

export async function fetchPlaces(
	lat: number,
	lng: number,
	radiusKm: number,
	type: PlaceType,
	page = 1,
): Promise<Place[]> {
	const contentTypeIds = resolveContentTypes(type);
	const results = await Promise.all(
		contentTypeIds.map((id) => fetchByContentType(lat, lng, radiusKm, id, page)),
	);
	return results.flat().sort((a, b) => a.distance - b.distance);
}

async function fetchByContentType(
	lat: number,
	lng: number,
	radiusKm: number,
	contentTypeId: number,
	page: number,
): Promise<Place[]> {
	const url = buildDataGoKrUrl(`${BASE_URL}/locationBasedList2`, env.TOUR_API_KEY, {
		MobileOS: "ETC",
		MobileApp: "Nadeuli",
		_type: "json",
		mapX: String(lng),
		mapY: String(lat),
		radius: String(radiusKm * 1000),
		contentTypeId: String(contentTypeId),
		numOfRows: "10",
		pageNo: String(page),
	});

	const res = await fetch(url);
	const data = (await res.json()) as TourApiResponse;

	if (data.response.header.resultCode !== "0000") return [];
	const items = data.response.body.items;
	if (!items || typeof items === "string") return [];

	return items.item.map((item) => ({
		contentId: item.contentid,
		title: item.title,
		address: [item.addr1, item.addr2].filter(Boolean).join(" "),
		lat: Number(item.mapy),
		lng: Number(item.mapx),
		distance: Math.round(Number(item.dist) / 10) / 100, // m → km (소수점 2자리)
		contentTypeId: Number(item.contenttypeid),
		imageUrl: item.firstimage || undefined,
		tel: item.tel || undefined,
	}));
}

function resolveContentTypes(type: PlaceType): number[] {
	if (type === "outdoor") return OUTDOOR_TYPES;
	if (type === "indoor") return INDOOR_TYPES;
	return [...OUTDOOR_TYPES, ...INDOOR_TYPES];
}
