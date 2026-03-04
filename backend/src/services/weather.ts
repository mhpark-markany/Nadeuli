import type { PrecipitationType, WbgtGrade, Weather } from "shared";
import { buildDataGoKrUrl } from "../lib/api-url.js";
import { env } from "../lib/env.js";
import { nowKST } from "../lib/kst.js";

const BASE_URL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0";

// ── 위경도 → 기상청 격자 변환 ──

interface GridXY {
	nx: number;
	ny: number;
}

export function toGrid(lat: number, lng: number): GridXY {
	const RE = 6371.00877;
	const GRID = 5.0;
	const SLAT1 = 30.0;
	const SLAT2 = 60.0;
	const OLON = 126.0;
	const OLAT = 38.0;
	const XO = 43;
	const YO = 136;

	const DEGRAD = Math.PI / 180.0;
	const re = RE / GRID;
	const slat1 = SLAT1 * DEGRAD;
	const slat2 = SLAT2 * DEGRAD;
	const olon = OLON * DEGRAD;
	const olat = OLAT * DEGRAD;

	const sn =
		Math.log(Math.cos(slat1) / Math.cos(slat2)) /
		Math.log(Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5));
	const sf = (Math.tan(Math.PI * 0.25 + slat1 * 0.5) ** sn * Math.cos(slat1)) / sn;
	const ro = (re * sf) / Math.tan(Math.PI * 0.25 + olat * 0.5) ** sn;

	const ra = (re * sf) / Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5) ** sn;
	let theta = lng * DEGRAD - olon;
	if (theta > Math.PI) theta -= 2.0 * Math.PI;
	if (theta < -Math.PI) theta += 2.0 * Math.PI;
	theta *= sn;

	return {
		nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
		ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5),
	};
}

// ── 초단기실황 조회 ──

interface NcstItem {
	category: string;
	obsrValue: string;
}

interface KmaResponse {
	response: { body: { items: { item: NcstItem[] } } };
}

export async function fetchWeather(lat: number, lng: number): Promise<Weather> {
	const { nx, ny } = toGrid(lat, lng);
	const now = nowKST();
	const baseDate = formatDate(now);
	const baseTime = formatTime(now);

	const url = buildDataGoKrUrl(`${BASE_URL}/getUltraSrtNcst`, env.KMA_API_KEY, {
		dataType: "JSON",
		numOfRows: "10",
		base_date: baseDate,
		base_time: baseTime,
		nx: String(nx),
		ny: String(ny),
	});

	const res = await fetch(url);
	const data = (await res.json()) as KmaResponse;
	const items = data.response.body.items.item;

	const map = new Map<string, number>();
	for (const item of items) {
		map.set(item.category, Number(item.obsrValue));
	}

	const temp = map.get("T1H") ?? 0;
	const humidity = map.get("REH") ?? 0;
	const windSpeed = map.get("WSD") ?? 0;
	const precipitation = map.get("RN1") ?? 0;
	const pty = map.get("PTY") ?? 0;

	const feelsLike = calcFeelsLike(temp, humidity, windSpeed);
	const wbgt = calcWBGT(temp, humidity);

	return {
		temperature: temp,
		humidity,
		windSpeed,
		precipitation,
		sky: "맑음", // 초단기실황에는 SKY 없음 — 단기예보에서 보강 가능
		precipitationType: ptyToType(pty),
		feelsLike: Math.round(feelsLike * 10) / 10,
		wbgt: Math.round(wbgt * 10) / 10,
		wbgtGrade: wbgtToGrade(wbgt),
		discomfortIndex: Math.round(calcDiscomfort(temp, humidity) * 10) / 10,
	};
}

// ── 체감온도 (여름: Heat Index 기반, 겨울: Wind Chill) ──

function calcFeelsLike(temp: number, humidity: number, wind: number): number {
	if (temp >= 27) {
		// 여름 체감온도 (간이 Heat Index)
		return (
			-8.785 +
			1.611 * temp +
			2.339 * humidity -
			0.1461 * temp * humidity -
			0.01231 * temp ** 2 -
			0.01642 * humidity ** 2 +
			0.002212 * temp ** 2 * humidity +
			0.0007255 * temp * humidity ** 2 -
			0.000003582 * temp ** 2 * humidity ** 2
		);
	}
	if (temp <= 10 && wind > 1.3) {
		// 겨울 체감온도 (Wind Chill)
		const v = wind * 3.6; // m/s → km/h
		return 13.12 + 0.6215 * temp - 11.37 * v ** 0.16 + 0.3965 * temp * v ** 0.16;
	}
	return temp;
}

// ── WBGT 추정 (기온 + 습도 기반 간이 산출) ──

function calcWBGT(temp: number, humidity: number): number {
	// 간이 WBGT ≈ 0.567×기온 + 0.393×수증기압 + 3.94
	const e = (humidity / 100) * 6.105 * Math.exp((17.27 * temp) / (237.7 + temp));
	return 0.567 * temp + 0.393 * e + 3.94;
}

// ── 불쾌지수 ──

function calcDiscomfort(temp: number, humidity: number): number {
	return 1.8 * temp - 0.55 * (1 - humidity / 100) * (1.8 * temp - 26) + 32;
}

// ── 유틸 ──

function wbgtToGrade(wbgt: number): WbgtGrade {
	if (wbgt <= 21) return "안전";
	if (wbgt <= 25) return "주의";
	if (wbgt <= 28) return "경계";
	if (wbgt <= 31) return "위험";
	return "매우위험";
}

function ptyToType(pty: number): PrecipitationType {
	if (pty === 1) return "비";
	if (pty === 2) return "비/눈";
	if (pty === 3) return "눈";
	return "없음";
}

function formatDate(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}${m}${day}`;
}

function formatTime(d: Date): string {
	// 초단기실황: 매시 40분 이후 발표 → 현재 시각 기준 직전 정시
	let h = d.getHours();
	if (d.getMinutes() < 40) h = h - 1;
	if (h < 0) h = 23;
	return `${String(h).padStart(2, "0")}00`;
}

// ── 단기예보 (getVilageFcst) ──

export interface HourlyWeather {
	hour: number;
	temp: number;
	sky: number; // 1맑음 3구름많음 4흐림
	pty: number; // 0없음 1비 2비/눈 3눈
	pop: number; // 강수확률 %
	wsd: number; // 풍속 m/s
}

interface FcstItem {
	fcstDate: string;
	fcstTime: string;
	category: string;
	fcstValue: string;
}

interface FcstResponse {
	response: {
		header: { resultCode: string };
		body: { items: { item: FcstItem[] } };
	};
}

const VILAGE_BASE_TIMES = ["2300", "2000", "1700", "1400", "1100", "0800", "0500", "0200"];

function getVilageFcstBase(now: Date): { baseDate: string; baseTime: string } {
	const h = now.getHours();
	const m = now.getMinutes();
	const current = h * 100 + m;

	// 발표시각은 base_time + 10분 (예: 0200 → 0210에 발표)
	for (const bt of VILAGE_BASE_TIMES) {
		if (current >= Number(bt) + 10) {
			return { baseDate: formatDate(now), baseTime: bt };
		}
	}
	// 자정~02:10 → 전날 2300
	const yesterday = new Date(now.getTime() - 86400000);
	return { baseDate: formatDate(yesterday), baseTime: "2300" };
}

export async function fetchHourlyForecast(lat: number, lng: number): Promise<HourlyWeather[]> {
	const { nx, ny } = toGrid(lat, lng);
	const now = nowKST();
	const { baseDate, baseTime } = getVilageFcstBase(now);

	const url = buildDataGoKrUrl(`${BASE_URL}/getVilageFcst`, env.KMA_API_KEY, {
		dataType: "JSON",
		numOfRows: "300",
		base_date: baseDate,
		base_time: baseTime,
		nx: String(nx),
		ny: String(ny),
	});

	const res = await fetch(url);
	const data = (await res.json()) as FcstResponse;
	if (data.response.header.resultCode !== "00") return [];

	const items = data.response.body.items.item;
	const today = formatDate(now);
	const tomorrow = formatDate(new Date(now.getTime() + 86400000));
	const currentHour = now.getHours();

	// 시간대별로 그룹핑 (현재시각 이후 ~ 12시간, 내일 포함)
	const hourMap = new Map<number, Partial<HourlyWeather>>();
	for (const item of items) {
		const isToday = item.fcstDate === today;
		const isTomorrow = item.fcstDate === tomorrow;
		if (!isToday && !isTomorrow) continue;

		let hour = Number(item.fcstTime.slice(0, 2));
		if (isTomorrow) hour += 24;
		if (isToday && hour <= currentHour) continue;

		const entry = hourMap.get(hour) ?? { hour };
		switch (item.category) {
			case "TMP":
				entry.temp = Number(item.fcstValue);
				break;
			case "SKY":
				entry.sky = Number(item.fcstValue);
				break;
			case "PTY":
				entry.pty = Number(item.fcstValue);
				break;
			case "POP":
				entry.pop = Number(item.fcstValue);
				break;
			case "WSD":
				entry.wsd = Number(item.fcstValue);
				break;
		}
		hourMap.set(hour, entry);
	}

	return [...hourMap.values()]
		.filter((h): h is HourlyWeather => h.temp != null)
		.sort((a, b) => a.hour - b.hour)
		.slice(0, 12);
}
