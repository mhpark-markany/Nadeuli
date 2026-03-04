const requiredKeys = [
	"AIRKOREA_API_KEY",
	"KMA_API_KEY",
	"TOUR_API_KEY",
	"GEMINI_API_KEY",
	"KAKAO_REST_API_KEY",
	"KAKAO_CLIENT_SECRET",
	"JWT_SECRET",
	"DATABASE_URL",
] as const;

type EnvKey = (typeof requiredKeys)[number];

interface Env extends Record<EnvKey, string> {
	REDIS_URL: string;
	PORT: number;
	CORS_ORIGIN: string;
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
		TOUR_API_KEY: process.env.TOUR_API_KEY ?? "",
		GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
		KAKAO_REST_API_KEY: process.env.KAKAO_REST_API_KEY ?? "",
		KAKAO_CLIENT_SECRET: process.env.KAKAO_CLIENT_SECRET ?? "",
		JWT_SECRET: process.env.JWT_SECRET ?? "",
		DATABASE_URL: process.env.DATABASE_PUBLIC_URL ?? process.env.DATABASE_URL ?? "",
		REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
		PORT: Number(process.env.PORT ?? "3000"),
		CORS_ORIGIN: process.env.CORS_ORIGIN ?? "*",
	};
}

export const env = loadEnv();
