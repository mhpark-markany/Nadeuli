import proj4 from "proj4";

// ── WGS84 → TM 중부원점 (EPSG:5181) 좌표 변환 ──
// 에어코리아 getNearbyMsrstnList API가 TM 좌표를 요구함

const WGS84 = "EPSG:4326";
const TM =
	"+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs";

export function toTM(lat: number, lng: number): { tmX: number; tmY: number } {
	const [tmX, tmY] = proj4(WGS84, TM, [lng, lat]);
	return { tmX, tmY };
}

// ── 위경도 → 시/도 단위 행정구역 코드 (기상청 생활기상지수 areaNo) ──
// 시/도 경계 중심 좌표 기반 최근접 매칭

interface Region {
	code: string;
	lat: number;
	lng: number;
}

const REGIONS: Region[] = [
	{ code: "1100000000", lat: 37.5665, lng: 126.978 }, // 서울
	{ code: "2600000000", lat: 35.1796, lng: 129.0756 }, // 부산
	{ code: "2700000000", lat: 35.8714, lng: 128.6014 }, // 대구
	{ code: "2800000000", lat: 37.4563, lng: 126.7052 }, // 인천
	{ code: "2900000000", lat: 35.1595, lng: 126.8526 }, // 광주
	{ code: "3000000000", lat: 36.3504, lng: 127.3845 }, // 대전
	{ code: "3100000000", lat: 35.5384, lng: 129.3114 }, // 울산
	{ code: "3600000000", lat: 36.48, lng: 127.0 }, // 세종
	{ code: "4100000000", lat: 37.275, lng: 127.0095 }, // 경기
	{ code: "5100000000", lat: 37.8228, lng: 128.1555 }, // 강원
	{ code: "4300000000", lat: 36.6357, lng: 127.4913 }, // 충북
	{ code: "4400000000", lat: 36.5184, lng: 126.8 }, // 충남
	{ code: "5200000000", lat: 35.716, lng: 127.1448 }, // 전북
	{ code: "4600000000", lat: 34.8161, lng: 126.4629 }, // 전남
	{ code: "4700000000", lat: 36.4919, lng: 128.8889 }, // 경북
	{ code: "4800000000", lat: 35.4606, lng: 128.2132 }, // 경남
	{ code: "5000000000", lat: 33.4996, lng: 126.5312 }, // 제주
];

export function toAreaNo(lat: number, lng: number): string {
	let nearest = REGIONS[0];
	let minDist = Number.MAX_VALUE;

	for (const r of REGIONS) {
		const d = (r.lat - lat) ** 2 + (r.lng - lng) ** 2;
		if (d < minDist) {
			minDist = d;
			nearest = r;
		}
	}
	return nearest.code;
}
