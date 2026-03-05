import Redis from "ioredis";
import { env } from "./env.js";

let redis: Redis | null = null;

function getRedis(): Redis | null {
	if (redis) return redis;
	try {
		redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true });
		redis.on("error", () => {
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

// ── 인메모리 폴백 ──
const memCache = new Map<string, { value: string; expiresAt: number }>();

function memGet(key: string): string | null {
	const entry = memCache.get(key);
	if (!entry) return null;
	if (Date.now() > entry.expiresAt) {
		memCache.delete(key);
		return null;
	}
	return entry.value;
}

function memSet(key: string, value: string, ttl: number): void {
	memCache.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
}

// ── 공개 API ──
const DEFAULT_TTL = 3600;

export async function cacheGet<T>(key: string): Promise<T | null> {
	const r = getRedis();
	if (r) {
		try {
			const val = await r.get(key);
			return val ? (JSON.parse(val) as T) : null;
		} catch {
			/* Redis 실패 시 인메모리 폴백 */
		}
	}
	const val = memGet(key);
	return val ? (JSON.parse(val) as T) : null;
}

export async function cacheSet(key: string, value: unknown, ttl = DEFAULT_TTL): Promise<void> {
	const json = JSON.stringify(value);
	const r = getRedis();
	if (r) {
		try {
			await r.set(key, json, "EX", ttl);
			return;
		} catch {
			/* Redis 실패 시 인메모리 폴백 */
		}
	}
	memSet(key, json, ttl);
}
