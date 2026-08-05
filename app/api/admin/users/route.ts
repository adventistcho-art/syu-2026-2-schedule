import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/admin/users?q=&department=
 * 관리자 — 전화번호부(엑셀) 전체 명단 검색
 * department 가 있으면:
 *   1) 해당 실무부서 소속
 *   2) 같은 상위부서 명단
 *   순으로 정렬
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

  let parentOfDept: string | null = null;
  if (department) {
    const sample = users.find(
      (u) =>
        (u.phoneDept || "").trim() === department ||
        (u.department || "").trim() === department
    );
    if (sample?.phoneParent) {
      parentOfDept = sample.phoneParent.trim();
    } else if (
      users.some((u) => (u.phoneParent || "").trim() === department)
    ) {
      parentOfDept = department;
    } else {
      // 검색 결과 밖일 수 있어 DB에서 한 번 더 조회
      const hit = await prisma.user.findFirst({
        where: {
          OR: [
            { phoneDept: department },
            { department: department },
            { phoneParent: department },
          ],
        },
        select: { phoneParent: true, phoneDept: true, department: true },
      });
      if (hit) {
        if ((hit.phoneParent || "").trim() === department) {
          parentOfDept = department;
        } else if (
          (hit.phoneDept || "").trim() === department ||
          (hit.department || "").trim() === department
        ) {
          parentOfDept = (hit.phoneParent || "").trim() || null;
        }
      }
    }
  }

  const scored = users.map((u) => {
    const dept = (u.department || "").trim();
    const phoneDept = (u.phoneDept || "").trim();
    const phoneParent = (u.phoneParent || "").trim();
    let score = 0;
    let matchTier: "unit" | "parent" | "other" = "other";
    if (department) {
      if (dept === department || phoneDept === department) {
        score = 3;
        matchTier = "unit";
      } else if (
        parentOfDept &&
        (phoneParent === parentOfDept ||
          phoneDept === parentOfDept ||
          dept === parentOfDept)
      ) {
        score = 2;
        matchTier = "parent";
      }
    }
    return { u, score, matchTier };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const pa = (a.u.phoneParent || "").localeCompare(b.u.phoneParent || "", "ko");
    if (pa !== 0) return pa;
    const da = (a.u.phoneDept || a.u.department || "").localeCompare(
      b.u.phoneDept || b.u.department || "",
      "ko"
    );
    if (da !== 0) return da;
    return a.u.name.localeCompare(b.u.name, "ko");
  });

  return NextResponse.json({
    users: scored.map(({ u, matchTier }) => ({
      employeeId: u.employeeId,
      name: u.name,
      department: u.department,
      phoneParent: u.phoneParent,
      phoneDept: u.phoneDept,
      phoneExt: u.phoneExt,
      isTeamLeader: u.isTeamLeader,
      role: u.role,
      matchTier,
    })),
    parentDepartment: parentOfDept,
    total: scored.length,
  });
}
