import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { loadDeptPublishers } from "@/lib/admin/deptPublishers";

const NON_DEPT_LABELS = new Set([
  "국공휴일",
  "국경일",
  "공휴일",
  "삼육대학교",
  "-",
  "",
]);

const SYSTEM_AUTHORS = new Set(["공식 학사력", "system", "시스템", ""]);

function isTrackedDept(dept: string) {
  return !NON_DEPT_LABELS.has((dept || "").trim());
}

function isTrackedAuthor(name: string | null | undefined, id: string | null | undefined) {
  const n = (name || "").trim();
  if (!n || SYSTEM_AUTHORS.has(n)) return false;
  if (id === "system") return false;
  return true;
}

/**
 * GET /api/admin/schedule-status
 * 관리자 전용 — 부서별 제출·작성 현황 / 계정별 작성 집계
 */
export async function GET() {
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

  const [users, events] = await Promise.all([
    prisma.user.findMany({
      select: {
        employeeId: true,
        name: true,
        department: true,
        phoneParent: true,
        phoneDept: true,
        isTeamLeader: true,
        role: true,
      },
      orderBy: [{ department: "asc" }, { name: "asc" }],
    }),
    prisma.event.findMany({
      where: {
        OR: [{ status: "DRAFT" }, { status: "PUBLISHED" }],
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    }),
  ]);

  /** 상위부서 / 실무부서 모두 행으로 노출 */
  type DeptKind = "parent" | "unit";
  type DeptKey = { department: string; kind: DeptKind; phoneParent: string | null };

  const parentNames = new Set<string>();
  const unitMeta = new Map<string, string | null>(); // phoneDept -> phoneParent

  for (const u of users) {
    const parent = (u.phoneParent || "").trim();
    const unit = (u.phoneDept || u.department || "").trim();
    if (parent && isTrackedDept(parent)) parentNames.add(parent);
    if (unit && isTrackedDept(unit)) {
      if (!unitMeta.has(unit)) {
        unitMeta.set(unit, parent || null);
      }
    }
  }

  const deptKeys: DeptKey[] = [];
  const seen = new Set<string>();

  for (const parent of Array.from(parentNames).sort((a, b) =>
    a.localeCompare(b, "ko")
  )) {
    deptKeys.push({ department: parent, kind: "parent", phoneParent: parent });
    seen.add(`parent:${parent}`);
  }

  for (const [unit, parent] of Array.from(unitMeta.entries()).sort((a, b) =>
    a[0].localeCompare(b[0], "ko")
  )) {
    // 실무부서명 = 상위부서명 이면 상위부서 행만 유지
    if (parent && unit === parent) continue;
    const key = `unit:${unit}`;
    if (seen.has(key)) continue;
    deptKeys.push({
      department: unit,
      kind: "unit",
      phoneParent: parent,
    });
    seen.add(key);
  }

  for (const e of events) {
    const dept = (e.dept || "").trim();
    if (!isTrackedDept(dept) || e.category === "HOLIDAY") continue;
    if (seen.has(`parent:${dept}`) || seen.has(`unit:${dept}`)) continue;
    deptKeys.push({
      department: dept,
      kind: parentNames.has(dept) ? "parent" : "unit",
      phoneParent: unitMeta.get(dept) ?? (parentNames.has(dept) ? dept : null),
    });
    seen.add(`${parentNames.has(dept) ? "parent" : "unit"}:${dept}`);
  }

  type AuthorAgg = {
    createdById: string | null;
    createdByName: string;
    department: string;
    draftCount: number;
    publishedCount: number;
    lastActivityAt: string | null;
    titles: string[];
  };

  type DeptAgg = {
    department: string;
    kind: DeptKind;
    phoneParent: string | null;
    memberCount: number;
    leaders: { name: string; employeeId: string }[];
    draftCount: number;
    publishedCount: number;
    /** 부서가 작성한 일정(시드/공휴일 제외) */
    authoredCount: number;
    status: "미작성" | "작성중" | "제출완료" | "작성중·제출완료";
    authors: { name: string; employeeId: string | null; draft: number; published: number }[];
    lastActivityAt: string | null;
    lastPublishedAt: string | null;
  };

  const belongsToDept = (
    u: { department: string; phoneDept: string | null; phoneParent: string | null },
    dept: string,
    kind: DeptKind
  ) => {
    const d = dept.trim();
    const phoneDept = (u.phoneDept || "").trim();
    const phoneParent = (u.phoneParent || "").trim();
    const department = (u.department || "").trim();
    if (kind === "parent") {
      return phoneParent === d || phoneDept === d || department === d;
    }
    return phoneDept === d || department === d;
  };

  const deptPublishers = await loadDeptPublishers();
  const userById = new Map(users.map((u) => [u.employeeId, u]));

  const deptMap = new Map<string, DeptAgg>();
  for (const { department: dept, kind, phoneParent } of deptKeys) {
    const members = users.filter((u) => belongsToDept(u, dept, kind));
    const leaderMap = new Map<string, { name: string; employeeId: string }>();
    for (const m of members.filter((x) => x.isTeamLeader)) {
      leaderMap.set(m.employeeId, { name: m.name, employeeId: m.employeeId });
    }
    // 관리자가 엑셀 명단에서 지정한 담당 (부서 칸별)
    for (const id of deptPublishers[dept] ?? []) {
      const u = userById.get(id);
      if (u) leaderMap.set(u.employeeId, { name: u.name, employeeId: u.employeeId });
    }
    deptMap.set(dept, {
      department: dept,
      kind,
      phoneParent,
      memberCount: members.length,
      leaders: Array.from(leaderMap.values()),
      draftCount: 0,
      publishedCount: 0,
      authoredCount: 0,
      status: "미작성",
      authors: [],
      lastActivityAt: null,
      lastPublishedAt: null,
    });
  }

  const authorMap = new Map<string, AuthorAgg>();
  const recentAuthored: Array<{
    id: number;
    title: string;
    dept: string;
    status: string;
    category: string;
    createdById: string | null;
    createdByName: string | null;
    startDate: string;
    endDate: string;
    publishedAt: string | null;
    updatedAt: string;
  }> = [];

  for (const e of events) {
    const dept = (e.dept || "").trim();
    if (!isTrackedDept(dept) || e.category === "HOLIDAY") continue;

    const tracked = isTrackedAuthor(e.createdByName, e.createdById);
    // 부서 집계: 부서 소속 일정 전부(공식 학사력도 dept가 있으면 카운트하되 authored는 별도)
    let agg = deptMap.get(dept);
    if (!agg) {
      agg = {
        department: dept,
        kind: parentNames.has(dept) ? "parent" : "unit",
        phoneParent: unitMeta.get(dept) ?? (parentNames.has(dept) ? dept : null),
        memberCount: 0,
        leaders: [],
        draftCount: 0,
        publishedCount: 0,
        authoredCount: 0,
        status: "미작성",
        authors: [],
        lastActivityAt: null,
        lastPublishedAt: null,
      };
      deptMap.set(dept, agg);
    }

    if (tracked) {
      if (e.status === "DRAFT") agg.draftCount += 1;
      if (e.status === "PUBLISHED") agg.publishedCount += 1;
      agg.authoredCount += 1;

      const updatedIso = e.updatedAt.toISOString();
      if (!agg.lastActivityAt || updatedIso > agg.lastActivityAt) {
        agg.lastActivityAt = updatedIso;
      }
      if (e.publishedAt) {
        const pubIso = e.publishedAt.toISOString();
        if (!agg.lastPublishedAt || pubIso > agg.lastPublishedAt) {
          agg.lastPublishedAt = pubIso;
        }
      }

      const authorKey = `${e.createdById ?? ""}::${e.createdByName ?? ""}::${dept}`;
      let author = authorMap.get(authorKey);
      if (!author) {
        author = {
          createdById: e.createdById,
          createdByName: e.createdByName ?? "(이름 없음)",
          department: dept,
          draftCount: 0,
          publishedCount: 0,
          lastActivityAt: null,
          titles: [],
        };
        authorMap.set(authorKey, author);
      }
      if (e.status === "DRAFT") author.draftCount += 1;
      if (e.status === "PUBLISHED") author.publishedCount += 1;
      if (!author.lastActivityAt || updatedIso > author.lastActivityAt) {
        author.lastActivityAt = updatedIso;
      }
      if (author.titles.length < 5) author.titles.push(e.title);

      if (recentAuthored.length < 80) {
        recentAuthored.push({
          id: e.id,
          title: e.title,
          dept,
          status: e.status,
          category: e.category,
          createdById: e.createdById,
          createdByName: e.createdByName,
          startDate: e.startDate.toISOString(),
          endDate: e.endDate.toISOString(),
          publishedAt: e.publishedAt?.toISOString() ?? null,
          updatedAt: updatedIso,
        });
      }
    }
  }

  // 부서별 작성자 요약 + 상태
  for (const agg of Array.from(deptMap.values())) {
    const related = Array.from(authorMap.values()).filter(
      (a) => a.department === agg.department
    );
    agg.authors = related
      .map((a) => ({
        name: a.createdByName,
        employeeId: a.createdById,
        draft: a.draftCount,
        published: a.publishedCount,
      }))
      .sort((a, b) => b.draft + b.published - (a.draft + a.published));

    if (agg.draftCount > 0 && agg.publishedCount > 0) {
      agg.status = "작성중·제출완료";
    } else if (agg.publishedCount > 0) {
      agg.status = "제출완료";
    } else if (agg.draftCount > 0) {
      agg.status = "작성중";
    } else {
      agg.status = "미작성";
    }
  }

  const departments = Array.from(deptMap.values()).sort((a, b) => {
    const groupA = a.phoneParent || a.department;
    const groupB = b.phoneParent || b.department;
    const g = groupA.localeCompare(groupB, "ko");
    if (g !== 0) return g;
    // 같은 상위부서 안에서는 상위부서 행을 먼저
    if (a.kind !== b.kind) return a.kind === "parent" ? -1 : 1;
    const rank = (s: DeptAgg["status"]) =>
      s === "미작성" ? 0 : s === "작성중" ? 1 : s === "작성중·제출완료" ? 2 : 3;
    const d = rank(a.status) - rank(b.status);
    if (d !== 0) return d;
    return a.department.localeCompare(b.department, "ko");
  });

  const authors = Array.from(authorMap.values()).sort(
    (a, b) =>
      b.draftCount +
      b.publishedCount -
      (a.draftCount + a.publishedCount)
  );

  const summary = {
    totalDepartments: departments.length,
    notStarted: departments.filter((d) => d.status === "미작성").length,
    inProgress: departments.filter(
      (d) => d.status === "작성중" || d.status === "작성중·제출완료"
    ).length,
    submitted: departments.filter(
      (d) => d.status === "제출완료" || d.status === "작성중·제출완료"
    ).length,
    totalDraft: departments.reduce((n, d) => n + d.draftCount, 0),
    totalPublishedAuthored: departments.reduce(
      (n, d) => n + d.publishedCount,
      0
    ),
    activeAuthors: authors.length,
  };

  return NextResponse.json({
    summary,
    departments,
    authors,
    recentEvents: recentAuthored,
  });
}
