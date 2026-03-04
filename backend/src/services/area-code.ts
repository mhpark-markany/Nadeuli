// TourAPI 지역코드 매핑
// https://api.visitkorea.or.kr 참고

interface AreaCode {
	areaCode: string;
	sigunguCode?: string;
}

// 시/도 코드
const SIDO_CODES: Record<string, string> = {
	서울: "1",
	인천: "2",
	대전: "3",
	대구: "4",
	광주: "5",
	부산: "6",
	울산: "7",
	세종: "8",
	경기: "31",
	강원: "32",
	충북: "33",
	충남: "34",
	경북: "35",
	경남: "36",
	전북: "37",
	전남: "38",
	제주: "39",
};

// 주요 시/군/구 코드 (areaCode, sigunguCode)
const SIGUNGU_CODES: Record<string, AreaCode> = {
	// 경기
	수원: { areaCode: "31", sigunguCode: "13" },
	성남: { areaCode: "31", sigunguCode: "9" },
	고양: { areaCode: "31", sigunguCode: "2" },
	용인: { areaCode: "31", sigunguCode: "17" },
	부천: { areaCode: "31", sigunguCode: "7" },
	안산: { areaCode: "31", sigunguCode: "14" },
	안양: { areaCode: "31", sigunguCode: "15" },
	평택: { areaCode: "31", sigunguCode: "25" },
	화성: { areaCode: "31", sigunguCode: "27" },
	// 강원
	춘천: { areaCode: "32", sigunguCode: "13" },
	원주: { areaCode: "32", sigunguCode: "9" },
	강릉: { areaCode: "32", sigunguCode: "1" },
	속초: { areaCode: "32", sigunguCode: "6" },
	평창: { areaCode: "32", sigunguCode: "11" },
	// 충북
	청주: { areaCode: "33", sigunguCode: "11" },
	충주: { areaCode: "33", sigunguCode: "12" },
	// 충남
	천안: { areaCode: "34", sigunguCode: "13" },
	아산: { areaCode: "34", sigunguCode: "9" },
	// 경북
	포항: { areaCode: "35", sigunguCode: "21" },
	경주: { areaCode: "35", sigunguCode: "2" },
	구미: { areaCode: "35", sigunguCode: "3" },
	안동: { areaCode: "35", sigunguCode: "11" },
	// 경남
	창원: { areaCode: "36", sigunguCode: "1" },
	김해: { areaCode: "36", sigunguCode: "3" },
	진주: { areaCode: "36", sigunguCode: "9" },
	거제: { areaCode: "36", sigunguCode: "2" },
	통영: { areaCode: "36", sigunguCode: "10" },
	// 전북
	전주: { areaCode: "37", sigunguCode: "12" },
	익산: { areaCode: "37", sigunguCode: "9" },
	군산: { areaCode: "37", sigunguCode: "2" },
	// 전남
	여수: { areaCode: "38", sigunguCode: "17" },
	순천: { areaCode: "38", sigunguCode: "12" },
	목포: { areaCode: "38", sigunguCode: "7" },
	광양: { areaCode: "38", sigunguCode: "2" },
	// 제주
	제주시: { areaCode: "39", sigunguCode: "3" },
	서귀포: { areaCode: "39", sigunguCode: "2" },
};

export function resolveAreaCode(query: string): AreaCode | null {
	const normalized = query.replace(/특별시|광역시|도|시|군|구/g, "").trim();

	// 시/군/구 먼저 확인
	if (SIGUNGU_CODES[normalized]) {
		return SIGUNGU_CODES[normalized];
	}

	// 시/도 확인
	if (SIDO_CODES[normalized]) {
		return { areaCode: SIDO_CODES[normalized] };
	}

	// 부분 매칭 시도
	for (const [name, code] of Object.entries(SIGUNGU_CODES)) {
		if (normalized.includes(name) || name.includes(normalized)) {
			return code;
		}
	}
	for (const [name, code] of Object.entries(SIDO_CODES)) {
		if (normalized.includes(name) || name.includes(normalized)) {
			return { areaCode: code };
		}
	}

	return null;
}
