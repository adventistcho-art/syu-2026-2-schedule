/**
 * Prisma Client 싱글턴
 * Next.js 개발 환경에서 핫 리로드 시 커넥션이 중복 생성되지 않도록 처리합니다.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
