const requiredKeys = [
	"AIRKOREA_API_KEY",
	"KMA_API_KEY",
	"KMA_APIHUB_AUTH_KEY",
	"TOUR_API_KEY",
	"GEMINI_API_KEY",
	"KAKAO_REST_API_KEY",
	"KAKAO_CLIENT_SECRET",
	"JWT_SECRET",
	"DATABASE_URL",
] as const;

type EnvKey = (typeof requiredKeys)[number];

interface Env extends Record<EnvKey, string> {
	GEMINI_MODEL: string;
	REDIS_URL: string;
	PORT: number;
	CORS_ORIGINS: string[];
}

function loadEnv(): Env {
	const missing: string[] = [];
	for (const key of requiredKeys) {
		if (!process.env[key]) missing.push(key);
	}
	if (missing.length > 0) {
		throw new Error(`필수 환경변수 누락: ${missing.join(", ")}`);
	}
	return {
		AIRKOREA_API_KEY: process.env.AIRKOREA_API_KEY ?? "",
		KMA_API_KEY: process.env.KMA_API_KEY ?? "",
		KMA_APIHUB_AUTH_KEY: process.env.KMA_APIHUB_AUTH_KEY ?? "",
		TOUR_API_KEY: process.env.TOUR_API_KEY ?? "",
		GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
		// 무료 등급 일일 한도: 3.x Flash 20회, 3.1 Flash-Lite 500회 (2026-10 측정·보고 기준). 한도가 바뀌면 환경 변수로 바꾼다.
		GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
		KAKAO_REST_API_KEY: process.env.KAKAO_REST_API_KEY ?? "",
		KAKAO_CLIENT_SECRET: process.env.KAKAO_CLIENT_SECRET ?? "",
		JWT_SECRET: process.env.JWT_SECRET ?? "",
		DATABASE_URL: process.env.DATABASE_URL ?? process.env.DATABASE_PUBLIC_URL ?? "",
		// 비우면 Redis 없이 인메모리 캐시만 쓴다 (Vercel 배포 기본값).
		REDIS_URL: process.env.REDIS_URL ?? "",
		PORT: Number(process.env.PORT ?? "3000"),
		CORS_ORIGINS: (process.env.CORS_ORIGIN ?? "*").split(",").map((s) => s.trim()),
	};
}

export const env = loadEnv();
