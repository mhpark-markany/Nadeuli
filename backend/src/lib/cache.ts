import Redis from "ioredis";
import { env } from "./env.js";

let redis: Redis | null = null;

function getRedis(): Redis | null {
	if (redis) return redis;
	try {
		redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true });
		redis.on("error", () => {
			// Redis 미연결 시 캐시 없이 동작
			redis = null;
		});
		redis.connect().catch(() => {
			redis = null;
		});
		return redis;
	} catch {
		return null;
	}
}

const DEFAULT_TTL = 3600; // 1시간

export async function cacheGet<T>(key: string): Promise<T | null> {
	const r = getRedis();
	if (!r) return null;
	try {
		const val = await r.get(key);
		return val ? (JSON.parse(val) as T) : null;
	} catch {
		return null;
	}
}

export async function cacheSet(key: string, value: unknown, ttl = DEFAULT_TTL): Promise<void> {
	const r = getRedis();
	if (!r) return;
	try {
		await r.set(key, JSON.stringify(value), "EX", ttl);
	} catch {
		// 캐시 실패는 무시
	}
}
