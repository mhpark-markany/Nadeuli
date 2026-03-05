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
	midLandRegId: string; // 중기육상예보 구역코드
	midTaRegId: string; // 중기기온예보 지점코드
}

const REGIONS: Region[] = [
	{
		code: "1100000000",
		lat: 37.5665,
		lng: 126.978,
		midLandRegId: "11B00000",
		midTaRegId: "11B10101",
	}, // 서울
	{
		code: "2600000000",
		lat: 35.1796,
		lng: 129.0756,
		midLandRegId: "11H20000",
		midTaRegId: "11H20201",
	}, // 부산
	{
		code: "2700000000",
		lat: 35.8714,
		lng: 128.6014,
		midLandRegId: "11H10000",
		midTaRegId: "11H10701",
	}, // 대구
	{
		code: "2800000000",
		lat: 37.4563,
		lng: 126.7052,
		midLandRegId: "11B00000",
		midTaRegId: "11B20201",
	}, // 인천
	{
		code: "2900000000",
		lat: 35.1595,
		lng: 126.8526,
		midLandRegId: "11F20000",
		midTaRegId: "11F20501",
	}, // 광주
	{
		code: "3000000000",
		lat: 36.3504,
		lng: 127.3845,
		midLandRegId: "11C20000",
		midTaRegId: "11C20401",
	}, // 대전
	{
		code: "3100000000",
		lat: 35.5384,
		lng: 129.3114,
		midLandRegId: "11H20000",
		midTaRegId: "11H20101",
	}, // 울산
	{ code: "3600000000", lat: 36.48, lng: 127.0, midLandRegId: "11C20000", midTaRegId: "11C20401" }, // 세종
	{
		code: "4100000000",
		lat: 37.275,
		lng: 127.0095,
		midLandRegId: "11B00000",
		midTaRegId: "11B20601",
	}, // 경기
	{
		code: "5100000000",
		lat: 37.8228,
		lng: 128.1555,
		midLandRegId: "11D10000",
		midTaRegId: "11D10301",
	}, // 강원
	{
		code: "4300000000",
		lat: 36.6357,
		lng: 127.4913,
		midLandRegId: "11C10000",
		midTaRegId: "11C10301",
	}, // 충북
	{
		code: "4400000000",
		lat: 36.5184,
		lng: 126.8,
		midLandRegId: "11C20000",
		midTaRegId: "11C20401",
	}, // 충남
	{
		code: "5200000000",
		lat: 35.716,
		lng: 127.1448,
		midLandRegId: "11F10000",
		midTaRegId: "11F10201",
	}, // 전북
	{
		code: "4600000000",
		lat: 34.8161,
		lng: 126.4629,
		midLandRegId: "11F20000",
		midTaRegId: "11F20501",
	}, // 전남
	{
		code: "4700000000",
		lat: 36.4919,
		lng: 128.8889,
		midLandRegId: "11H10000",
		midTaRegId: "11H10701",
	}, // 경북
	{
		code: "4800000000",
		lat: 35.4606,
		lng: 128.2132,
		midLandRegId: "11H20000",
		midTaRegId: "11H20201",
	}, // 경남
	{
		code: "5000000000",
		lat: 33.4996,
		lng: 126.5312,
		midLandRegId: "11G00000",
		midTaRegId: "11G00201",
	}, // 제주
];

export function toAreaNo(lat: number, lng: number): string {
	return findNearestRegion(lat, lng).code;
}

export function toMidRegIds(lat: number, lng: number): { landRegId: string; taRegId: string } {
	const r = findNearestRegion(lat, lng);
	return { landRegId: r.midLandRegId, taRegId: r.midTaRegId };
}

function findNearestRegion(lat: number, lng: number): Region {
	let nearest = REGIONS[0];
	let minDist = Number.MAX_VALUE;

	for (const r of REGIONS) {
		const d = (r.lat - lat) ** 2 + (r.lng - lng) ** 2;
		if (d < minDist) {
			minDist = d;
			nearest = r;
		}
	}
	return nearest;
}
