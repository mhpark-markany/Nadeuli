import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "@prisma/client";
import { attachDatabasePool } from "@vercel/functions";
import pg from "pg";
import { env } from "./env.js";

const { PrismaClient } = pkg;
const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
// Vercel Fluid compute 에서 함수가 멈추기 전에 유휴 연결을 정리한다. Vercel 밖에서는 아무 일도 하지 않는다.
attachDatabasePool(pool);
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
