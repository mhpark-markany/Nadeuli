import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: "../.env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // 마이그레이션은 풀러(PgBouncer)를 거치지 않는 직접 연결을 쓴다.
  // DATABASE_URL_UNPOOLED: Vercel Marketplace 로 붙인 Neon 이 넣어 주는 직접 연결 주소
  datasource: {
    url:
      process.env["DATABASE_URL_UNPOOLED"] ??
      process.env["DATABASE_PUBLIC_URL"] ??
      process.env["DATABASE_URL"],
  },
});
