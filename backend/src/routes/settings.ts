import { Hono } from "hono";
import type { Prisma, User } from "../generated/prisma/client.js";
import { authMiddleware } from "../lib/auth-middleware.js";
import { prisma } from "../lib/db.js";

type Variables = { user: User };

const settings = new Hono<{ Variables: Variables }>();

settings.use("*", authMiddleware);

// 설정 조회
settings.get("/", async (c) => {
	const user = c.get("user");

	const userSettings = await prisma.userSettings.findUnique({
		where: { userId: user.id },
	});

	return c.json({
		customPrompt: userSettings?.customPrompt ?? null,
		preferences: userSettings?.preferences ?? {},
	});
});

// 설정 저장/수정
settings.put("/", async (c) => {
	const user = c.get("user");
	const body = await c.req.json<{
		customPrompt?: string | null;
		preferences?: Prisma.InputJsonValue;
	}>();

	const userSettings = await prisma.userSettings.upsert({
		where: { userId: user.id },
		update: {
			customPrompt: body.customPrompt,
			preferences: body.preferences ?? {},
		},
		create: {
			userId: user.id,
			customPrompt: body.customPrompt,
			preferences: body.preferences ?? {},
		},
	});

	return c.json({
		customPrompt: userSettings.customPrompt,
		preferences: userSettings.preferences,
	});
});

export { settings };
