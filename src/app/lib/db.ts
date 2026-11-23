import { PrismaClient } from "@/generated/prisma/client";

import { PrismaPg } from "@prisma/adapter-pg";

const globalDb = globalThis as typeof globalThis & { prisma?: PrismaClient };
export const db = globalDb.prisma ?? new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 }),
});
if (process.env.NODE_ENV !== "production") globalDb.prisma = db;
