// Vercel 함수 진입점. vercel.json 의 rewrites 가 /api/* 와 /health 를 이 함수로 보낸다.
// 로컬 개발은 backend/src/index.ts 의 Node 서버를 그대로 쓴다.
import { app } from "../../backend/src/app.js";

export default {
	fetch: app.fetch,
};
