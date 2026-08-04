import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/records?year=2025  — 연도별 실적 전체 조회 */
export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get("year") ?? 2025);
  try {
    const records = await prisma.performanceRecord.findMany({
      where: { year },
      include: { subIndicator: true },
    });
    return NextResponse.json(records);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "DB 조회 실패" }, { status: 500 });
  }
}

/**
 * POST /api/records
 * body: { subIndicatorId, year, actualValue, submittedBy? }
 * 제출(SUBMITTED) 또는 임시저장(DRAFT)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subIndicatorId, year, actualValue, status = "SUBMITTED", submittedBy = "" } = body;

    if (!subIndicatorId || !year) {
      return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
    }

    const record = await prisma.performanceRecord.upsert({
      where: { subIndicatorId_year: { subIndicatorId, year } },
      update: {
        actualValue: actualValue ?? null,
        status,
        submittedBy: submittedBy || null,
        submittedAt: status === "SUBMITTED" ? new Date() : undefined,
      },
      create: {
        subIndicatorId,
        year,
        actualValue: actualValue ?? null,
        status,
        submittedBy: submittedBy || null,
        submittedAt: status === "SUBMITTED" ? new Date() : null,
      },
    });
    return NextResponse.json(record);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }
}

/**
 * PATCH /api/records
 * 관리자 전용: 목표값(targetValue) 또는 실적값(actualValue) 수정
 * body: { subIndicatorId, year, targetValue?, actualValue? }
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { subIndicatorId, year, targetValue, actualValue } = body;
    if (!subIndicatorId || !year) {
      return NextResponse.json({ error: "subIndicatorId, year 필수" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (targetValue !== undefined) updateData.targetValue = Number(targetValue);
    if (actualValue !== undefined) {
      updateData.actualValue = Number(actualValue);
      updateData.status = "SUBMITTED";
      updateData.submittedAt = new Date();
    }

    const record = await prisma.performanceRecord.upsert({
      where: { subIndicatorId_year: { subIndicatorId, year } },
      update: updateData,
      create: {
        subIndicatorId,
        year,
        targetValue: targetValue !== undefined ? Number(targetValue) : null,
        actualValue: actualValue !== undefined ? Number(actualValue) : null,
        status: actualValue !== undefined ? "SUBMITTED" : "DRAFT",
      },
    });
    return NextResponse.json(record);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "수정 실패" }, { status: 500 });
  }
}
