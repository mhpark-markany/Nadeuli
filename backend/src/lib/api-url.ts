/** data.go.kr serviceKey는 URLSearchParams가 이중 인코딩하므로 encodeURIComponent로 1회만 인코딩하여 직접 붙인다. */
export function buildDataGoKrUrl(
	base: string,
	serviceKey: string,
	params: Record<string, string>,
): string {
	const url = new URL(base);
	for (const [k, v] of Object.entries(params)) {
		url.searchParams.set(k, v);
	}
	const sep = url.search ? "&" : "?";
	return `${url.toString()}${sep}serviceKey=${encodeURIComponent(serviceKey)}`;
}

/** apihub.kma.go.kr는 authKey를 일반 쿼리 파라미터로 전달한다. */
export function buildApihubUrl(
	base: string,
	authKey: string,
	params: Record<string, string>,
): string {
	const url = new URL(base);
	for (const [k, v] of Object.entries(params)) {
		url.searchParams.set(k, v);
	}
	url.searchParams.set("authKey", authKey);
	return url.toString();
}

/** fetch 응답을 JSON으로 파싱. res.ok가 아니면 응답 본문을 포함한 에러를 던진다. */
export async function fetchJsonSafe<T>(res: Response): Promise<T> {
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
	}
	return (await res.json()) as T;
}
