import type {
	ApiResponse,
	AskResponse,
	DashboardData,
	Festival,
	OutdoorScore,
	Place,
} from "shared";

const BASE = `${import.meta.env.VITE_API_URL ?? ""}/api`;

async function fetchJson<T>(url: string): Promise<T> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`API 오류: ${res.status}`);
	const json = (await res.json()) as ApiResponse<T>;
	if (!json.success || !json.data) {
		throw new Error(json.error?.message ?? "알 수 없는 오류");
	}
	return json.data;
}

export async function fetchDashboard(lat: number, lng: number): Promise<DashboardData> {
	const qs = `lat=${lat}&lng=${lng}`;
	const [airQuality, weather, lifeIndex, score] = await Promise.all([
		fetchJson<DashboardData["airQuality"]>(`${BASE}/air-quality?${qs}`),
		fetchJson<DashboardData["weather"]>(`${BASE}/weather?${qs}`),
		fetchJson<DashboardData["lifeIndex"]>(`${BASE}/life-index?${qs}`),
		fetchJson<OutdoorScore>(`${BASE}/score?${qs}`),
	]);
	return { airQuality, weather, lifeIndex, score };
}

export async function fetchPlaces(
	lat: number,
	lng: number,
	type: "outdoor" | "indoor" | "all" = "all",
): Promise<Place[]> {
	return fetchJson<Place[]>(`${BASE}/places?lat=${lat}&lng=${lng}&radius=5&type=${type}`);
}

export async function fetchFestivals(): Promise<Festival[]> {
	return fetchJson<Festival[]>(`${BASE}/festivals`);
}

export async function askAI(question: string, lat: number, lng: number): Promise<AskResponse> {
	const res = await fetch(`${BASE}/ask`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ question, location: { lat, lng } }),
	});
	if (!res.ok) throw new Error(`API 오류: ${res.status}`);
	const json = (await res.json()) as ApiResponse<AskResponse>;
	if (!json.success || !json.data) {
		throw new Error(json.error?.message ?? "알 수 없는 오류");
	}
	return json.data;
}

export interface GeocodedAddress {
	address: string;
	sido: string;
	sigungu: string;
	dong: string;
}

export async function fetchAddress(lat: number, lng: number): Promise<GeocodedAddress> {
	return fetchJson<GeocodedAddress>(`${BASE}/geocode?lat=${lat}&lng=${lng}`);
}
