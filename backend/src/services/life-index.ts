import type { LifeIndex } from "shared";
import { buildDataGoKrUrl } from "../lib/api-url.js";
import { env } from "../lib/env.js";
import { nowKST } from "../lib/kst.js";

const BASE = "http://apis.data.go.kr/1360000";

// ── 생활기상지수 통합 조회 ──

export async function fetchLifeIndex(areaNo: string): Promise<LifeIndex> {
	const now = nowKST();
	const time = formatDateTime(now);
	const month = now.getMonth() + 1;

	const [uv, pollen, foodPoison, airStag] = await Promise.all([
		fetchIndex(`${BASE}/LivingWthrIdxServiceV4/getUVIdxV4`, areaNo, time),
		isPollenSeason(month)
			? fetchIndex(`${BASE}/LivingWthrIdxServiceV4/getAirDiffusionIdxV4`, areaNo, time)
			: Promise.resolve(undefined),
		isSummer(month)
			? fetchIndex(`${BASE}/LivingWthrIdxServiceV4/getFoodPoisoningIdxV4`, areaNo, time)
			: Promise.resolve(undefined),
		fetchIndex(`${BASE}/LivingWthrIdxServiceV4/getAirDiffusionIdxV4`, areaNo, time),
	]);

	return {
		uvIndex: uv ?? 0,
		uvGrade: uvToGrade(uv ?? 0),
		pollenRisk: pollen,
		foodPoisoning: foodPoison,
		airStagnation: airStag,
	};
}

// ── 개별 지수 조회 ──

interface LifeIndexResponse {
	response: {
		header: { resultCode: string };
		body: {
			items: { item: Array<{ h3: string; h6: string; h9: string; h12: string }> };
		};
	};
}

async function fetchIndex(
	endpoint: string,
	areaNo: string,
	time: string,
): Promise<number | undefined> {
	try {
		const url = buildDataGoKrUrl(endpoint, env.KMA_API_KEY, {
			dataType: "JSON",
			numOfRows: "1",
			areaNo,
			time,
		});

		const res = await fetch(url);
		const data = (await res.json()) as LifeIndexResponse;
		if (data.response.header.resultCode !== "00") return undefined;

		const item = data.response.body.items.item[0];
		if (!item) return undefined;
		// 가장 가까운 시간대 값 반환
		const val = item.h3 || item.h6 || item.h9 || item.h12;
		return val ? Number(val) : undefined;
	} catch {
		return undefined;
	}
}

// ── 유틸 ──

function uvToGrade(uv: number): string {
	if (uv <= 2) return "낮음";
	if (uv <= 5) return "보통";
	if (uv <= 7) return "높음";
	if (uv <= 10) return "매우높음";
	return "위험";
}

function isPollenSeason(month: number): boolean {
	return [4, 5, 8, 9, 10].includes(month);
}

function isSummer(month: number): boolean {
	return [6, 7, 8].includes(month);
}

function formatDateTime(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	const h = String(d.getHours()).padStart(2, "0");
	return `${y}${m}${day}${h}`;
}
