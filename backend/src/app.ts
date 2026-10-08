import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./lib/env.js";
import { airQualityRoute } from "./routes/air-quality.js";
import { askRoute } from "./routes/ask.js";
import { auth } from "./routes/auth.js";
import { festivalsRoute } from "./routes/festivals.js";
import { geocodeRoute } from "./routes/geocode.js";
import { lifeIndexRoute } from "./routes/life-index.js";
import { placesRoute } from "./routes/places.js";
import { scoreRoute } from "./routes/score.js";
import { settings } from "./routes/settings.js";
import { weatherRoute } from "./routes/weather.js";

// 로컬 서버(index.ts)와 Vercel 함수(frontend/api/index.ts)가 같은 앱을 쓴다.
const app = new Hono();

app.use("*", cors({ origin: env.CORS_ORIGINS }));

app.route("/api/air-quality", airQualityRoute);
app.route("/api/weather", weatherRoute);
app.route("/api/life-index", lifeIndexRoute);
app.route("/api/score", scoreRoute);
app.route("/api/places", placesRoute);
app.route("/api/festivals", festivalsRoute);
app.route("/api/ask", askRoute);
app.route("/api/geocode", geocodeRoute);
app.route("/api/auth", auth);
app.route("/api/settings", settings);

app.get("/health", (c) => c.json({ status: "ok" }));

export { app };
