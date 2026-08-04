import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/components
 * body: { indexId, id?, name, weight, formula, unit, targetValue? }
 * id를 안 보내면 자동 채번 (indexId + 기존 최대 suffix + 1)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { indexId, name, weight, formula, unit, targetValue } = body;

    if (!indexId || !name) {
      return NextResponse.json({ error: "indexId, name 필수" }, { status: 400 });
    }

    // 자동 채번: 기존 구성지표 중 같은 지수 소속 최대 ID + 1
    let newId = body.id as string | undefined;
    if (!newId) {
      const siblings = await prisma.componentIndicator.findMany({
        where: { indexId },
        select: { id: true },
        orderBy: { id: "desc" },
      });
      if (siblings.length === 0) {
        // indexId가 "10000" → 첫 구성지표 "10100"
        newId = String(Number(indexId) + 100);
      } else {
        // 기존 최대 suffix + 100 (예: 10200 다음은 10300)
        const maxId = Math.max(...siblings.map((s) => Number(s.id)));
        newId = String(maxId + 100);
      }
    }

    const comp = await prisma.componentIndicator.create({
      data: {
        id: newId,
        indexId,
        name,
        weight: Number(weight ?? 0),
        formula: formula ?? "A",
        unit: unit ?? "",
        targetValue: targetValue !== undefined && targetValue !== null ? Number(targetValue) : null,
      },
      include: { subIndicators: true },
    });

    return NextResponse.json(comp, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "생성 실패" }, { status: 500 });
  }
}
