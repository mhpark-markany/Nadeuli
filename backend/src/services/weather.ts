import type { DailyForecast, PrecipitationType, Sky, WbgtGrade, Weather } from "shared";
import { buildDataGoKrUrl, fetchJsonSafe } from "../lib/api-url.js";
import { env } from "../lib/env.js";
import { nowKST } from "../lib/kst.js";
import { toMidRegIds } from "./geo.js";

const BASE_URL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0";
const MID_BASE_URL = "http://apis.data.go.kr/1360000/MidFcstInfoService";

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

	const gridParams = { nx: String(nx), ny: String(ny) };

	// 초단기실황 + 초단기예보 병렬 호출
	const [ncstRes, ultraFcstRes] = await Promise.all([
		fetch(
			buildDataGoKrUrl(`${BASE_URL}/getUltraSrtNcst`, env.KMA_API_KEY, {
				dataType: "JSON",
				numOfRows: "10",
				base_date: baseDate,
				base_time: baseTime,
				...gridParams,
			}),
		),
		fetch(
			buildDataGoKrUrl(`${BASE_URL}/getUltraSrtFcst`, env.KMA_API_KEY, {
				dataType: "JSON",
				numOfRows: "60",
				...getUltraFcstBase(now),
				...gridParams,
			}),
		),
	]);

	// 초단기실황 파싱
	const ncstData = await fetchJsonSafe<KmaResponse>(ncstRes);
	const items = ncstData.response.body.items.item;
	const map = new Map<string, number>();
	for (const item of items) {
		map.set(item.category, Number(item.obsrValue));
	}

	const temp = map.get("T1H") ?? 0;
	const humidity = map.get("REH") ?? 0;
	const windSpeed = map.get("WSD") ?? 0;
	const precipitation = map.get("RN1") ?? 0;
	const pty = map.get("PTY") ?? 0;

	// 초단기예보에서 가장 가까운 시각의 SKY/PTY 보강
	let sky: Sky = "맑음";
	let fcstPty = pty;
	try {
		const ultraData = await fetchJsonSafe<FcstResponse>(ultraFcstRes);
		if (ultraData.response.header.resultCode === "00") {
			const nearest = findNearestFcst(ultraData.response.body.items.item);
			if (nearest.sky != null) sky = skyCodeToLabel(nearest.sky);
			if (nearest.pty != null) fcstPty = nearest.pty;
		}
	} catch {
		/* 초단기예보 실패 시 실황만 사용 */
	}

	// 실황 PTY > 0이면 실황 우선, 아니면 예보 사용
	const finalPty = pty > 0 ? pty : fcstPty;

	const feelsLike = calcFeelsLike(temp, humidity, windSpeed);
	const wbgt = calcWBGT(temp, humidity);

	return {
		temperature: temp,
		humidity,
		windSpeed,
		precipitation,
		sky,
		precipitationType: ptyToType(finalPty),
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

function skyCodeToLabel(code: number): Sky {
	if (code === 3) return "구름많음";
	if (code === 4) return "흐림";
	return "맑음";
}

// 초단기예보: 매시 30분 발표 (45분에 API 제공)
function getUltraFcstBase(now: Date): { base_date: string; base_time: string } {
	let h = now.getHours();
	if (now.getMinutes() < 45) h -= 1;
	if (h < 0) {
		const yesterday = new Date(now.getTime() - 86400000);
		return { base_date: formatDate(yesterday), base_time: "2330" };
	}
	return { base_date: formatDate(now), base_time: `${String(h).padStart(2, "0")}30` };
}

// 초단기예보 응답에서 가장 가까운 시각의 SKY/PTY 추출
function findNearestFcst(items: FcstItem[]): { sky: number | null; pty: number | null } {
	// 가장 이른 fcstTime 찾기
	let earliest = "9999";
	for (const item of items) {
		if (item.fcstTime < earliest) earliest = item.fcstTime;
	}
	let sky: number | null = null;
	let pty: number | null = null;
	for (const item of items) {
		if (item.fcstTime !== earliest) continue;
		if (item.category === "SKY") sky = Number(item.fcstValue);
		if (item.category === "PTY") pty = Number(item.fcstValue);
	}
	return { sky, pty };
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
	const data = await fetchJsonSafe<FcstResponse>(res);
	if (data.response.header.resultCode !== "00") return [];

	const items = data.response.body.items.item;
	const today = formatDate(now);
	const tomorrow = formatDate(new Date(now.getTime() + 86400000));
	const currentHour = now.getHours();

	// 시간대별로 그룹핑 (현재시각 이후, 오늘 남은 시간 전체 + 내일)
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
		.sort((a, b) => a.hour - b.hour);
}

// ── 주간예보 (단기예보 D+0~2 + 중기예보 D+3~6) ──

interface MidResponse {
	response: {
		header: { resultCode: string };
		body: { items: { item: Record<string, unknown>[] } };
	};
}

export async function fetchWeeklyForecast(lat: number, lng: number): Promise<DailyForecast[]> {
	const now = nowKST();
	const { nx, ny } = toGrid(lat, lng);
	const { landRegId, taRegId } = toMidRegIds(lat, lng);
	const tmFc = getMidFcstTmFc(now);

	// 단기예보 D+0~3 + 중기예보 D+4~7 병렬 호출
	const midTaUrl = buildDataGoKrUrl(`${MID_BASE_URL}/getMidTa`, env.KMA_API_KEY, {
		dataType: "JSON",
		numOfRows: "1",
		regId: taRegId,
		tmFc,
	});
	const midLandUrl = buildDataGoKrUrl(`${MID_BASE_URL}/getMidLandFcst`, env.KMA_API_KEY, {
		dataType: "JSON",
		numOfRows: "1",
		regId: landRegId,
		tmFc,
	});

	const [shortDays, midTaRes, midLandRes] = await Promise.all([
		fetchShortTermDaily(nx, ny, now),
		fetch(midTaUrl).catch((e) => {
			console.warn("[Weekly] 중기기온 fetch 실패:", e);
			return null;
		}),
		fetch(midLandUrl).catch((e) => {
			console.warn("[Weekly] 중기육상 fetch 실패:", e);
			return null;
		}),
	]);

	let midDays: DailyForecast[] = [];
	if (midTaRes?.ok && midLandRes?.ok) {
		try {
			midDays = parseMidTerm(await midTaRes.json(), await midLandRes.json(), now);
		} catch (e) {
			console.warn("[Weekly] 중기예보 파싱 실패:", e);
		}
	} else if (midTaRes || midLandRes) {
		console.warn(
			`[Weekly] 중기예보 API 응답 실패 — Ta: ${midTaRes?.status ?? "null"}, Land: ${midLandRes?.status ?? "null"}`,
		);
	}

	return [...shortDays, ...midDays].slice(0, 7);
}

// 중기예보 발표시각: 06시, 18시
function getMidFcstTmFc(now: Date): string {
	const h = now.getHours();
	const date =
		h >= 18
			? formatDate(now)
			: h >= 6
				? formatDate(now)
				: formatDate(new Date(now.getTime() - 86400000));
	const time = h >= 18 ? "1800" : h >= 6 ? "0600" : "1800";
	return `${date}${time}`;
}

// 단기예보 → 일별 집계 (D+0~2)
async function fetchShortTermDaily(nx: number, ny: number, now: Date): Promise<DailyForecast[]> {
	const { baseDate, baseTime } = getVilageFcstBase(now);
	const url = buildDataGoKrUrl(`${BASE_URL}/getVilageFcst`, env.KMA_API_KEY, {
		dataType: "JSON",
		numOfRows: "1000",
		base_date: baseDate,
		base_time: baseTime,
		nx: String(nx),
		ny: String(ny),
	});

	const res = await fetch(url);
	const data = await fetchJsonSafe<FcstResponse>(res);
	if (data.response.header.resultCode !== "00") return [];

	// 날짜별 그룹핑
	const dayMap = new Map<
		string,
		{ temps: number[]; pops: number[]; skys: number[]; ptys: number[] }
	>();
	for (const item of data.response.body.items.item) {
		const d = dayMap.get(item.fcstDate) ?? { temps: [], pops: [], skys: [], ptys: [] };
		switch (item.category) {
			case "TMP":
				d.temps.push(Number(item.fcstValue));
				break;
			case "POP":
				d.pops.push(Number(item.fcstValue));
				break;
			case "SKY":
				d.skys.push(Number(item.fcstValue));
				break;
			case "PTY":
				d.ptys.push(Number(item.fcstValue));
				break;
		}
		dayMap.set(item.fcstDate, d);
	}

	const today = formatDate(now);
	return [...dayMap.entries()]
		.filter(([date]) => date >= today)
		.sort(([a], [b]) => a.localeCompare(b))
		.slice(0, 4)
		.map(([date, d]) => ({
			date,
			minTemp: d.temps.length > 0 ? Math.min(...d.temps) : 0,
			maxTemp: d.temps.length > 0 ? Math.max(...d.temps) : 0,
			sky: skyCodeToLabel(mode(d.skys) ?? 1),
			precipitationType: d.ptys.some((p) => p > 0)
				? ptyToType(mode(d.ptys.filter((p) => p > 0)) ?? 1)
				: "없음",
			pop: d.pops.length > 0 ? Math.max(...d.pops) : 0,
		}));
}

// 중기예보 파싱 (D+3~6)
function parseMidTerm(taData: unknown, landData: unknown, now: Date): DailyForecast[] {
	const result: DailyForecast[] = [];
	try {
		const ta = (taData as MidResponse).response.body.items.item[0];
		const land = (landData as MidResponse).response.body.items.item[0];
		if (!ta || !land) return [];

		for (let d = 4; d <= 7; d++) {
			const minTemp = Number(ta[`taMin${d}`] ?? 0);
			const maxTemp = Number(ta[`taMax${d}`] ?? 0);
			const pop =
				d <= 7
					? Math.max(Number(land[`rnSt${d}Am`] ?? 0), Number(land[`rnSt${d}Pm`] ?? 0))
					: Number(land[`rnSt${d}`] ?? 0);
			const wf = String(d <= 7 ? (land[`wf${d}Pm`] ?? "맑음") : (land[`wf${d}`] ?? "맑음"));
			const { sky, precipitationType } = parseMidWf(wf);

			const date = formatDate(new Date(now.getTime() + d * 86400000));
			result.push({ date, minTemp, maxTemp, sky, precipitationType, pop });
		}
	} catch {
		/* 중기예보 파싱 실패 시 빈 배열 */
	}
	return result;
}

function parseMidWf(wf: string): { sky: Sky; precipitationType: PrecipitationType } {
	let sky: Sky = "맑음";
	let precipitationType: PrecipitationType = "없음";

	if (wf.includes("흐리")) sky = "흐림";
	else if (wf.includes("구름많")) sky = "구름많음";

	if (wf.includes("비/눈")) precipitationType = "비/눈";
	else if (wf.includes("눈")) precipitationType = "눈";
	else if (wf.includes("비") || wf.includes("소나기")) precipitationType = "비";

	return { sky, precipitationType };
}

// 최빈값
function mode(arr: number[]): number | null {
	if (arr.length === 0) return null;
	const freq = new Map<number, number>();
	let maxCount = 0;
	let result = arr[0];
	for (const v of arr) {
		const c = (freq.get(v) ?? 0) + 1;
		freq.set(v, c);
		if (c > maxCount) {
			maxCount = c;
			result = v;
		}
	}
	return result;
}
