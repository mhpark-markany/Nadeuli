import type {
	AirQuality,
	ApiResponse,
	AskResponse,
	DailyForecast,
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

/** 화면 뼈대에 필요한 날씨만 기다린다. 대기질·점수는 에어코리아 장애 때 늦어지므로 따로 부른다. */
export async function fetchDashboard(
	lat: number,
	lng: number,
): Promise<Pick<DashboardData, "weather" | "weeklyForecast">> {
	const qs = `lat=${lat}&lng=${lng}`;
	const [weather, weeklyForecast] = await Promise.all([
		fetchJson<DashboardData["weather"]>(`${BASE}/weather?${qs}`),
		fetchJson<DailyForecast[]>(`${BASE}/weather/weekly?${qs}`).catch(() => []),
	]);
	return { weather, weeklyForecast };
}

export async function fetchAirQuality(lat: number, lng: number): Promise<AirQuality> {
	return fetchJson<AirQuality>(`${BASE}/air-quality?lat=${lat}&lng=${lng}`);
}

export async function fetchScore(lat: number, lng: number): Promise<OutdoorScore> {
	return fetchJson<OutdoorScore>(`${BASE}/score?lat=${lat}&lng=${lng}`);
}

export async function fetchPlaces(
	lat: number,
	lng: number,
	type: "outdoor" | "indoor" | "all" = "all",
	page = 1,
): Promise<Place[]> {
	return fetchJson<Place[]>(
		`${BASE}/places?lat=${lat}&lng=${lng}&radius=5&type=${type}&page=${page}`,
	);
}

export async function fetchFestivals(lat: number, lng: number): Promise<Festival[]> {
	return fetchJson<Festival[]>(`${BASE}/festivals?lat=${lat}&lng=${lng}`);
}

export async function askAI(question: string, lat: number, lng: number): Promise<AskResponse> {
	const headers: Record<string, string> = { "Content-Type": "application/json" };
	const token = sessionStorage.getItem("accessToken");
	if (token) headers.Authorization = `Bearer ${token}`;

	const res = await fetch(`${BASE}/ask`, {
		method: "POST",
		headers,
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
