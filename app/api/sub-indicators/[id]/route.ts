import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const updated = await prisma.subIndicator.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.deptName !== undefined && { deptName: body.deptName }),
        ...(body.variableKey !== undefined && { variableKey: body.variableKey }),
        ...(body.inputType !== undefined && { inputType: body.inputType }),
        ...(body.masterCode !== undefined && { masterCode: body.masterCode ?? null }),
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
 * DELETE /api/sub-indicators/:id
 * 관련 실적 기록(EditLog 포함)도 함께 삭제
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const records = await prisma.performanceRecord.findMany({
      where: { subIndicatorId: params.id },
      select: { id: true },
    });
    const recIds = records.map((r) => r.id);
    if (recIds.length > 0) {
      await prisma.editLog.deleteMany({ where: { recordId: { in: recIds } } });
      await prisma.performanceRecord.deleteMany({ where: { id: { in: recIds } } });
    }
    await prisma.subIndicator.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
}
