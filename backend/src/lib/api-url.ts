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
