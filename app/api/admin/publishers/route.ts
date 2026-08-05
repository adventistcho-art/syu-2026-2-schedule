import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

const bodySchema = z.object({
  employeeId: z.string().min(1),
  canPublish: z.boolean(),
  /** 지정 대상 부서(실무부서) — 해당 부서 소속인지 검증 */
  department: z.string().optional(),
});

/**
 * PATCH /api/admin/publishers
 * 관리자 — 전체일정 담당(isTeamLeader) 지정/해제
 */
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "관리자만 접근할 수 있습니다." },
      { status: 403 }
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { employeeId: parsed.data.employeeId },
  });
  if (!target) {
    return NextResponse.json(
      { error: "해당 계정을 찾을 수 없습니다." },
      { status: 404 }
    );
  }
  if (target.role === "ADMIN") {
    return NextResponse.json(
      { error: "관리자 계정은 변경할 수 없습니다." },
      { status: 400 }
    );
  }

  const dept = (parsed.data.department || "").trim();
  if (dept && parsed.data.canPublish) {
    const inDept =
      (target.department || "").trim() === dept ||
      (target.phoneDept || "").trim() === dept;
    if (!inDept) {
      return NextResponse.json(
        {
          error: `선택한 계정이 「${dept}」 소속이 아닙니다. 해당 부서 명단에서 다시 선택하세요.`,
        },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.user.update({
    where: { employeeId: parsed.data.employeeId },
    data: { isTeamLeader: parsed.data.canPublish },
    select: {
      employeeId: true,
      name: true,
      department: true,
      phoneDept: true,
      isTeamLeader: true,
    },
  });

  return NextResponse.json({ ok: true, user: updated });
}
