import { readFileSync } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type TargetDept = {
  phoneParent: string;
  phoneDept: string;
  label: string;
};

/**
 * GET /api/login/dept-options
 * 로그인용 실무부서(상위부서) 콤보 — 전화번호부 대상부서 + 등록 계정 부서
 */
export async function GET() {
  const byKey = new Map<string, TargetDept>();

  try {
    const file = path.join(process.cwd(), "data", "phonebook-2026-1.json");
    const raw = JSON.parse(readFileSync(file, "utf8")) as {
      targetDepartments?: TargetDept[];
    };
    for (const t of raw.targetDepartments ?? []) {
      if (!t.phoneParent || !t.phoneDept) continue;
      byKey.set(`${t.phoneParent}\u0001${t.phoneDept}`, {
        phoneParent: t.phoneParent,
        phoneDept: t.phoneDept,
        label: `${t.phoneDept}(${t.phoneParent})`,
      });
    }
  } catch {
    // JSON 없으면 DB만 사용
  }

  const rows = await prisma.user.findMany({
    where: {
      phoneParent: { not: null },
      phoneDept: { not: null },
    },
    select: {
      phoneParent: true,
      phoneDept: true,
    },
    distinct: ["phoneParent", "phoneDept"],
  });

  for (const r of rows) {
    if (!r.phoneParent || !r.phoneDept) continue;
    const key = `${r.phoneParent}\u0001${r.phoneDept}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        phoneParent: r.phoneParent,
        phoneDept: r.phoneDept,
        label: `${r.phoneDept}(${r.phoneParent})`,
      });
    }
  }

  const options = Array.from(byKey.values())
    .sort((a, b) =>
      a.label.localeCompare(b.label, "ko", { sensitivity: "base" })
    )
    .map((o) => ({
      ...o,
      value: `${o.phoneParent}\u0001${o.phoneDept}`,
    }));

  return NextResponse.json({ options });
}
