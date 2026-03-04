import { env } from "../lib/env.js";

interface KakaoAddressDocument {
	address_name: string;
	x: string;
	y: string;
}

interface KakaoAddressResponse {
	documents: KakaoAddressDocument[];
}

export interface Coordinates {
	lat: number;
	lng: number;
	address: string;
}

export async function searchAddress(query: string): Promise<Coordinates | null> {
	const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=1`;
	const res = await fetch(url, {
		headers: { Authorization: `KakaoAK ${env.KAKAO_REST_API_KEY}` },
	});

	if (!res.ok) return null;

	const data = (await res.json()) as KakaoAddressResponse;
	const doc = data.documents[0];

	if (!doc) return null;

	return {
		lat: Number(doc.y),
		lng: Number(doc.x),
		address: doc.address_name,
	};
}
