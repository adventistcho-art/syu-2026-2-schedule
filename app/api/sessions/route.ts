import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/sessions — 전체 세션 목록 */
export async function GET() {
  try {
    const sessions = await prisma.yearSession.findMany({
      orderBy: { year: "desc" },
    });
    return NextResponse.json(sessions);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}

/**
 * POST /api/sessions
 * body: { year, deadline? }
 * 새 연도 세션 개설 (status=OPEN)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { year, deadline } = body;
    if (!year) return NextResponse.json({ error: "year 필수" }, { status: 400 });

    const session = await prisma.yearSession.upsert({
      where: { year },
      update: { status: "OPEN", deadline: deadline ?? null, openedAt: new Date().toISOString() },
      create: {
        year,
        status: "OPEN",
        deadline: deadline ?? null,
        openedAt: new Date().toISOString(),
      },
    });

    // 해당 연도의 IndexApproval 초기화 (없으면 생성)
    const indexes = await prisma.compositeIndex.findMany({ select: { id: true } });
    for (const idx of indexes) {
      await prisma.indexApproval.upsert({
        where: { indexId_year: { indexId: idx.id, year } },
        update: {},
        create: { indexId: idx.id, year, status: "COLLECTING", isPublic: false },
      });
    }

    return NextResponse.json(session);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "생성 실패" }, { status: 500 });
  }
}
