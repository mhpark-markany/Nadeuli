import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { env } from "./lib/env.js";

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
	console.log(`🌤️ 나들이 서버 시작: http://localhost:${info.port}`);
});

export { app };
