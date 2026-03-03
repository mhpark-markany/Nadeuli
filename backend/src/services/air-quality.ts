import type { AirGrade, AirQuality, CaiGrade } from "shared";
import { buildDataGoKrUrl } from "../lib/api-url.js";
import { env } from "../lib/env.js";

const BASE_URL = "http://apis.data.go.kr/B552584/ArpltnInforInqireSvc";

// ── 가장 가까운 측정소 조회 ──
// MsrstnInfoInqireSvc 별도 신청 필요 → fallback으로 주요 측정소 목록에서 최근접 선택

const STATIONS: Array<{ name: string; lat: number; lng: number }> = [
	{ name: "종로구", lat: 37.572, lng: 127.005 },
	{ name: "중구", lat: 37.564, lng: 126.998 },
	{ name: "용산구", lat: 37.532, lng: 126.99 },
	{ name: "성동구", lat: 37.551, lng: 127.041 },
	{ name: "광진구", lat: 37.546, lng: 127.094 },
	{ name: "동대문구", lat: 37.583, lng: 127.05 },
	{ name: "중랑구", lat: 37.597, lng: 127.093 },
	{ name: "성북구", lat: 37.606, lng: 127.018 },
	{ name: "강북구", lat: 37.643, lng: 127.011 },
	{ name: "도봉구", lat: 37.654, lng: 127.03 },
	{ name: "노원구", lat: 37.654, lng: 127.077 },
	{ name: "은평구", lat: 37.617, lng: 126.927 },
	{ name: "서대문구", lat: 37.579, lng: 126.939 },
	{ name: "마포구", lat: 37.559, lng: 126.908 },
	{ name: "양천구", lat: 37.524, lng: 126.856 },
	{ name: "강서구", lat: 37.551, lng: 126.849 },
	{ name: "구로구", lat: 37.494, lng: 126.858 },
	{ name: "금천구", lat: 37.457, lng: 126.896 },
	{ name: "영등포구", lat: 37.526, lng: 126.896 },
	{ name: "동작구", lat: 37.498, lng: 126.952 },
	{ name: "관악구", lat: 37.478, lng: 126.952 },
	{ name: "서초구", lat: 37.484, lng: 127.032 },
	{ name: "강남구", lat: 37.514, lng: 127.047 },
	{ name: "송파구", lat: 37.505, lng: 127.115 },
	{ name: "강동구", lat: 37.545, lng: 127.144 },
];

export function findNearestStation(_tmX: number, _tmY: number, lat: number, lng: number): string {
	let minDist = Number.POSITIVE_INFINITY;
	let nearest = "종로구";
	for (const s of STATIONS) {
		const d = (s.lat - lat) ** 2 + (s.lng - lng) ** 2;
		if (d < minDist) {
			minDist = d;
			nearest = s.name;
		}
	}
	return nearest;
}

// ── 실시간 대기질 조회 ──

interface AirApiItem {
	stationName: string;
	pm25Value: string;
	pm25Grade: string;
	pm10Value: string;
	pm10Grade: string;
	o3Value: string;
	o3Grade: string;
	dataTime: string;
}

interface AirApiResponse {
	response: { body: { items: AirApiItem[] } };
}

export async function fetchAirQuality(stationName: string): Promise<AirQuality> {
	const url = buildDataGoKrUrl(`${BASE_URL}/getMsrstnAcctoRltmMesureDnsty`, env.AIRKOREA_API_KEY, {
		returnType: "json",
		stationName,
		dataTerm: "DAILY",
		numOfRows: "1",
	});

	const res = await fetch(url);
	const data = (await res.json()) as AirApiResponse;
	const item = data.response.body.items[0];
	if (!item) throw new Error("대기질 데이터 없음");

	const pm25 = Number(item.pm25Value) || 0;
	const pm10 = Number(item.pm10Value) || 0;
	const o3 = Number(item.o3Value) || 0;

	const cai = calculateCAI(pm25, pm10, o3);

	return {
		stationName: item.stationName,
		pm25Value: pm25,
		pm25Grade: toGrade(item.pm25Grade),
		pm10Value: pm10,
		pm10Grade: toGrade(item.pm10Grade),
		o3Value: o3,
		o3Grade: toGrade(item.o3Grade),
		cai: cai.value,
		caiGrade: cai.grade,
		dataTime: item.dataTime,
	};
}

// ── CAI 산출 (통합대기환경지수) ──
// 각 오염물질별 개별 CAI 산출 후 최고치 채택

interface CaiResult {
	value: number;
	grade: CaiGrade;
}

function calculateCAI(pm25: number, pm10: number, o3: number): CaiResult {
	const caiPm25 = calcSubCAI(pm25, [15, 35, 75, 500], [50, 100, 250, 500]);
	const caiPm10 = calcSubCAI(pm10, [30, 80, 150, 600], [50, 100, 250, 500]);
	// o3 단위: ppm → 에어코리아 기준 breakpoint
	const caiO3 = calcSubCAI(o3, [0.03, 0.09, 0.15, 0.6], [50, 100, 250, 500]);

	const value = Math.round(Math.max(caiPm25, caiPm10, caiO3));
	return { value, grade: caiToGrade(value) };
}

function calcSubCAI(
	concentration: number,
	bp: [number, number, number, number],
	caiRange: [number, number, number, number],
): number {
	const ranges = [
		{ lo: 0, hi: bp[0], caiLo: 0, caiHi: caiRange[0] },
		{ lo: bp[0], hi: bp[1], caiLo: caiRange[0], caiHi: caiRange[1] },
		{ lo: bp[1], hi: bp[2], caiLo: caiRange[1], caiHi: caiRange[2] },
		{ lo: bp[2], hi: bp[3], caiLo: caiRange[2], caiHi: caiRange[3] },
	];

	for (const r of ranges) {
		if (concentration <= r.hi) {
			return ((r.caiHi - r.caiLo) / (r.hi - r.lo)) * (concentration - r.lo) + r.caiLo;
		}
	}
	return 500;
}

function caiToGrade(cai: number): CaiGrade {
	if (cai <= 50) return "좋음";
	if (cai <= 100) return "보통";
	if (cai <= 250) return "나쁨";
	return "매우나쁨";
}

function toGrade(raw: string): AirGrade {
	const n = Number(raw);
	if (n >= 1 && n <= 4) return n as AirGrade;
	return 2;
}
