import { Hono } from "hono";
import { prisma } from "../lib/db.js";
import { env } from "../lib/env.js";
import { signAccessToken, signRefreshToken, verifyToken } from "../lib/jwt.js";

const auth = new Hono();

interface KakaoTokenResponse {
	access_token: string;
	token_type: string;
	refresh_token: string;
	expires_in: number;
}

interface KakaoUserResponse {
	id: number;
	properties?: {
		nickname?: string;
		profile_image?: string;
	};
}

// 카카오 로그인 URL 반환
auth.get("/kakao/login", (c) => {
	const redirectUri = c.req.query("redirect_uri");
	if (!redirectUri) {
		return c.json({ error: "redirect_uri 필요" }, 400);
	}

	const kakaoAuthUrl = new URL("https://kauth.kakao.com/oauth/authorize");
	kakaoAuthUrl.searchParams.set("client_id", env.KAKAO_REST_API_KEY);
	kakaoAuthUrl.searchParams.set("redirect_uri", redirectUri);
	kakaoAuthUrl.searchParams.set("response_type", "code");

	return c.json({ url: kakaoAuthUrl.toString() });
});

// 카카오 콜백 처리 (code → token → user info → JWT)
auth.post("/kakao/callback", async (c) => {
	const body = await c.req.json<{ code: string; redirect_uri: string }>();
	const { code, redirect_uri } = body;

	if (!code || !redirect_uri) {
		return c.json({ error: "code, redirect_uri 필요" }, 400);
	}

	// 1. 카카오 토큰 발급
	const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "authorization_code",
			client_id: env.KAKAO_REST_API_KEY,
			client_secret: env.KAKAO_CLIENT_SECRET,
			redirect_uri,
			code,
		}),
	});

	if (!tokenRes.ok) {
		return c.json({ error: "카카오 토큰 발급 실패" }, 401);
	}

	const tokenData = (await tokenRes.json()) as KakaoTokenResponse;

	// 2. 카카오 사용자 정보 조회
	const userRes = await fetch("https://kapi.kakao.com/v2/user/me", {
		headers: { Authorization: `Bearer ${tokenData.access_token}` },
	});

	if (!userRes.ok) {
		return c.json({ error: "카카오 사용자 정보 조회 실패" }, 401);
	}

	const kakaoUser = (await userRes.json()) as KakaoUserResponse;

	// 3. DB에서 사용자 조회 또는 생성
	const user = await prisma.user.upsert({
		where: { kakaoId: String(kakaoUser.id) },
		update: {
			nickname: kakaoUser.properties?.nickname,
			profileImage: kakaoUser.properties?.profile_image,
		},
		create: {
			kakaoId: String(kakaoUser.id),
			nickname: kakaoUser.properties?.nickname,
			profileImage: kakaoUser.properties?.profile_image,
		},
	});

	// 4. JWT 발급
	const [accessToken, refreshToken] = await Promise.all([
		signAccessToken(user.id),
		signRefreshToken(user.id),
	]);

	return c.json({
		accessToken,
		refreshToken,
		user: {
			id: user.id,
			nickname: user.nickname,
			profileImage: user.profileImage,
		},
	});
});

// 토큰 갱신
auth.post("/refresh", async (c) => {
	const body = await c.req.json<{ refreshToken: string }>();
	const { refreshToken } = body;

	if (!refreshToken) {
		return c.json({ error: "refreshToken 필요" }, 400);
	}

	const payload = await verifyToken(refreshToken);
	if (!payload) {
		return c.json({ error: "유효하지 않은 토큰" }, 401);
	}

	const user = await prisma.user.findUnique({ where: { id: payload.sub } });
	if (!user) {
		return c.json({ error: "사용자 없음" }, 401);
	}

	const accessToken = await signAccessToken(user.id);

	return c.json({ accessToken });
});

export { auth };
