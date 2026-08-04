import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/sub-indicators
 * body: { componentId, id?, name, variableKey, deptName, unit, inputType, description?, masterCode? }
 * id 없으면 자동 채번 (componentId 내 최대 suffix + 1)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { componentId, name, variableKey, deptName, unit, inputType, description, masterCode } = body;

    if (!componentId || !name || !variableKey || !deptName) {
      return NextResponse.json({ error: "componentId, name, variableKey, deptName 필수" }, { status: 400 });
    }

    // 자동 채번
    let newId = body.id as string | undefined;
    if (!newId) {
      const siblings = await prisma.subIndicator.findMany({
        where: { componentId },
        select: { id: true },
        orderBy: { id: "desc" },
      });
      if (siblings.length === 0) {
        // componentId "10100" → 첫 하위지표 "10101"
        newId = String(Number(componentId) + 1);
      } else {
        const maxId = Math.max(...siblings.map((s) => Number(s.id)));
        newId = String(maxId + 1);
      }
    }

    const sub = await prisma.subIndicator.create({
      data: {
        id: newId,
        componentId,
        name,
        variableKey,
        deptName,
        unit: unit ?? "",
        inputType: inputType ?? "MANUAL",
        description: description ?? null,
        masterCode: masterCode ?? null,
      },
    });

    return NextResponse.json(sub, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "생성 실패" }, { status: 500 });
  }
}
