import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/admin/users?q=&department=
 * 관리자 — 전화번호부(엑셀) 전체 명단 검색
 * department 가 있으면 해당 부서·상위부서 소속을 위로 정렬
 */
export async function GET(req: NextRequest) {
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

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const department = (req.nextUrl.searchParams.get("department") || "").trim();

  const and: Prisma.UserWhereInput[] = [];

  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { phoneExt: { contains: q } },
        { employeeId: { contains: q, mode: "insensitive" } },
        { department: { contains: q, mode: "insensitive" } },
        { phoneDept: { contains: q, mode: "insensitive" } },
        { phoneParent: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  const users = await prisma.user.findMany({
    where: and.length ? { AND: and } : undefined,
    select: {
      employeeId: true,
      name: true,
      department: true,
      phoneParent: true,
      phoneDept: true,
      phoneExt: true,
      isTeamLeader: true,
      role: true,
    },
    orderBy: [{ name: "asc" }, { employeeId: "asc" }],
    take: 500,
  });

  const scored = users.map((u) => {
    const dept = (u.department || "").trim();
    const phoneDept = (u.phoneDept || "").trim();
    const phoneParent = (u.phoneParent || "").trim();
    let score = 0;
    if (department) {
      if (dept === department || phoneDept === department) score += 2;
      if (phoneParent === department) score += 1;
    }
    return { u, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.u.name.localeCompare(b.u.name, "ko");
  });

  return NextResponse.json({
    users: scored.map(({ u }) => ({
      employeeId: u.employeeId,
      name: u.name,
      department: u.department,
      phoneParent: u.phoneParent,
      phoneDept: u.phoneDept,
      phoneExt: u.phoneExt,
      isTeamLeader: u.isTeamLeader,
      role: u.role,
    })),
    total: scored.length,
  });
}
