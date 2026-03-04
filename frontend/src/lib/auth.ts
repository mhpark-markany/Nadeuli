const BASE = `${import.meta.env.VITE_API_URL ?? ""}/api/auth`;

export interface AuthUser {
	id: string;
	nickname: string | null;
	profileImage: string | null;
}

interface AuthResponse {
	accessToken: string;
	refreshToken: string;
	user: AuthUser;
}

// 토큰 저장소
export function getAccessToken(): string | null {
	return sessionStorage.getItem("accessToken");
}

export function getRefreshToken(): string | null {
	return localStorage.getItem("refreshToken");
}

export function setTokens(accessToken: string, refreshToken: string) {
	sessionStorage.setItem("accessToken", accessToken);
	localStorage.setItem("refreshToken", refreshToken);
}

export function clearTokens() {
	sessionStorage.removeItem("accessToken");
	localStorage.removeItem("refreshToken");
}

// 카카오 로그인 URL 가져오기
export async function getKakaoLoginUrl(): Promise<string> {
	const redirectUri = `${window.location.origin}/auth/kakao/callback`;
	const res = await fetch(`${BASE}/kakao/login?redirect_uri=${encodeURIComponent(redirectUri)}`);
	if (!res.ok) throw new Error("로그인 URL 가져오기 실패");
	const data = (await res.json()) as { url: string };
	return data.url;
}

// 카카오 콜백 처리
export async function handleKakaoCallback(code: string): Promise<AuthResponse> {
	const redirectUri = `${window.location.origin}/auth/kakao/callback`;
	const res = await fetch(`${BASE}/kakao/callback`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ code, redirect_uri: redirectUri }),
	});
	if (!res.ok) throw new Error("로그인 실패");
	return res.json() as Promise<AuthResponse>;
}

// 토큰 갱신
export async function refreshAccessToken(): Promise<string | null> {
	const refreshToken = getRefreshToken();
	if (!refreshToken) return null;

	const res = await fetch(`${BASE}/refresh`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ refreshToken }),
	});

	if (!res.ok) {
		clearTokens();
		return null;
	}

	const data = (await res.json()) as { accessToken: string };
	sessionStorage.setItem("accessToken", data.accessToken);
	return data.accessToken;
}
