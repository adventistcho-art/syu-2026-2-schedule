import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import {
  isAssignedSomewhere,
  setDeptPublisher,
} from "@/lib/admin/deptPublishers";

const bodySchema = z.object({
  employeeId: z.string().min(1),
  canPublish: z.boolean(),
  department: z.string().optional(),
});

/**
 * PATCH /api/admin/publishers
 * 관리자 — 전체일정 담당 지정/해제 (엑셀 전화번호부 명단 전원)
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

  const dept = (parsed.data.department || "").trim();
  if (dept) {
    await setDeptPublisher(dept, parsed.data.employeeId, parsed.data.canPublish);
  }

  const canPublishFlag =
    parsed.data.canPublish ||
    (await isAssignedSomewhere(parsed.data.employeeId));

  const updated = await prisma.user.update({
    where: { employeeId: parsed.data.employeeId },
    data: { isTeamLeader: canPublishFlag },
    select: {
      employeeId: true,
      name: true,
      department: true,
      phoneDept: true,
      phoneParent: true,
      isTeamLeader: true,
    },
  });

  return NextResponse.json({ ok: true, user: updated });
}
