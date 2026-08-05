import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/admin/users?q=&department=
 * 관리자 — 전체일정 담당 지정용 명단 검색
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

  const and: Prisma.UserWhereInput[] = [{ role: { not: "ADMIN" } }];

  if (department) {
    and.push({
      OR: [{ department }, { phoneDept: department }],
    });
  }

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
    where: { AND: and },
    select: {
      employeeId: true,
      name: true,
      department: true,
      phoneParent: true,
      phoneDept: true,
      phoneExt: true,
      isTeamLeader: true,
    },
    orderBy: [{ name: "asc" }, { employeeId: "asc" }],
    take: 80,
  });

  return NextResponse.json({ users });
}
