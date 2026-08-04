import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/login/dept-options — 로그인용 상위부서(실무부서) 콤보 (비인증) */
export async function GET() {
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
    orderBy: [{ phoneParent: "asc" }, { phoneDept: "asc" }],
  });

  const options = rows
    .filter((r) => r.phoneParent && r.phoneDept)
    .map((r) => ({
      phoneParent: r.phoneParent as string,
      phoneDept: r.phoneDept as string,
      label: `${r.phoneParent}(${r.phoneDept})`,
      value: `${r.phoneParent}\u0001${r.phoneDept}`,
    }));

  return NextResponse.json({ options });
}
