import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/master-codes?year=2025 */
export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get("year") ?? 2025);
  try {
    const codes = await prisma.masterCode.findMany({
      where: { year },
      orderBy: { code: "asc" },
    });
    return NextResponse.json(codes);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}

/** PATCH /api/master-codes — 마스터 코드 값 갱신 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json(); // { code, year, value }
    const { code, year, value } = body;
    if (!code || !year || value === undefined) {
      return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
    }
    const mc = await prisma.masterCode.upsert({
      where: { code_year: { code, year } },
      update: { value: Number(value) },
      create: { code, year, name: code, value: Number(value) },
    });
    return NextResponse.json(mc);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "수정 실패" }, { status: 500 });
  }
}
