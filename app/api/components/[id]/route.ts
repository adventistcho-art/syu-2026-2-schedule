import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const comp = await prisma.componentIndicator.findUnique({
      where: { id: params.id },
      include: { subIndicators: true, trendData: { orderBy: { year: "asc" } } },
    });
    if (!comp) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(comp);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "DB 조회 실패" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const updated = await prisma.componentIndicator.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.weight !== undefined && { weight: Number(body.weight) }),
        ...(body.formula !== undefined && { formula: body.formula }),
        ...(body.targetValue !== undefined && { targetValue: body.targetValue !== null ? Number(body.targetValue) : null }),
        ...(body.unit !== undefined && { unit: body.unit }),
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "수정 실패" }, { status: 500 });
  }
}

/**
 * DELETE /api/components/:id
 * 관련 하위지표·실적기록·추이데이터 모두 cascade 삭제
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 하위지표 ID 목록 조회
    const subs = await prisma.subIndicator.findMany({
      where: { componentId: params.id },
      select: { id: true },
    });
    const subIds = subs.map((s) => s.id);

    // 실적 기록 삭제 (EditLog는 PerformanceRecord에 cascade)
    if (subIds.length > 0) {
      const records = await prisma.performanceRecord.findMany({
        where: { subIndicatorId: { in: subIds } },
        select: { id: true },
      });
      const recIds = records.map((r) => r.id);
      if (recIds.length > 0) {
        await prisma.editLog.deleteMany({ where: { recordId: { in: recIds } } });
        await prisma.performanceRecord.deleteMany({ where: { id: { in: recIds } } });
      }
      await prisma.subIndicator.deleteMany({ where: { componentId: params.id } });
    }

    // 추이 데이터 삭제
    await prisma.componentTrendData.deleteMany({ where: { componentId: params.id } });

    // 구성지표 삭제
    await prisma.componentIndicator.delete({ where: { id: params.id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
}
