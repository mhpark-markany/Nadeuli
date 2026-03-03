const requiredKeys = ["AIRKOREA_API_KEY", "KMA_API_KEY", "TOUR_API_KEY", "GEMINI_API_KEY"] as const;

type EnvKey = (typeof requiredKeys)[number];

function loadEnv(): Record<EnvKey, string> & {
	REDIS_URL: string;
	PORT: number;
	CORS_ORIGIN: string;
} {
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
		REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
		PORT: Number(process.env.PORT ?? "3000"),
		CORS_ORIGIN: process.env.CORS_ORIGIN ?? "*",
	};
}

export const env = loadEnv();
