import type { Context, Next } from "hono";
import { prisma } from "./db.js";
import { verifyToken } from "./jwt.js";

export async function authMiddleware(c: Context, next: Next) {
	const authHeader = c.req.header("Authorization");
	if (!authHeader?.startsWith("Bearer ")) {
		return c.json({ error: "인증 필요" }, 401);
	}

	const token = authHeader.slice(7);
	const payload = await verifyToken(token);
	if (!payload) {
		return c.json({ error: "유효하지 않은 토큰" }, 401);
	}

	const user = await prisma.user.findUnique({ where: { id: payload.sub } });
	if (!user) {
		return c.json({ error: "사용자 없음" }, 401);
	}

	c.set("user", user);
	await next();
}
