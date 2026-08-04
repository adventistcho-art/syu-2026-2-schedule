import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/sessions/:year */
export async function GET(
  _req: NextRequest,
  { params }: { params: { year: string } }
) {
  const year = Number(params.year);
  try {
    const session = await prisma.yearSession.findUnique({ where: { year } });
    if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // 해당 연도 지수별 승인 상태 포함
    const approvals = await prisma.indexApproval.findMany({ where: { year } });
    return NextResponse.json({ ...session, approvals });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}

/**
 * PATCH /api/sessions/:year
 * body: {
 *   status?: "OPEN" | "CLOSED" | "APPROVED"
 *   deadline?: string | null
 *   indexId?: string          ← 특정 지수만 승인 상태 변경
 *   indexStatus?: "COLLECTING" | "PENDING" | "APPROVED"
 *   isPublic?: boolean        ← 지수 공시 여부
 * }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { year: string } }
) {
  const year = Number(params.year);
  try {
    const body = await req.json();

    // 지수별 승인 / 공시 상태 변경
    if (body.indexId !== undefined) {
      const updated = await prisma.indexApproval.upsert({
        where: { indexId_year: { indexId: body.indexId, year } },
        update: {
          ...(body.indexStatus !== undefined && { status: body.indexStatus }),
          ...(body.isPublic !== undefined && { isPublic: Boolean(body.isPublic) }),
        },
        create: {
          indexId: body.indexId,
          year,
          status: body.indexStatus ?? "COLLECTING",
          isPublic: body.isPublic ?? false,
        },
      });
      return NextResponse.json(updated);
    }

    // 세션 전체 상태 변경
    const session = await prisma.yearSession.upsert({
      where: { year },
      update: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.deadline !== undefined && { deadline: body.deadline }),
      },
      create: {
        year,
        status: body.status ?? "OPEN",
        deadline: body.deadline ?? null,
        openedAt: new Date().toISOString(),
      },
    });
    return NextResponse.json(session);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "수정 실패" }, { status: 500 });
  }
}
