import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { resolveCanPublish } from "@/lib/auth/publishPermission";

const publishSchema = z.object({
  ids: z.array(z.number().int().positive()).optional(),
  dept: z.string().optional(),
});

/**
 * POST /api/events/publish
 * 부서 DRAFT → 전체일정(PUBLISHED)
 * 권한: ADMIN 또는 전화번호부 F열 지정자
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await resolveCanPublish({
    role: user.role,
    isTeamLeader: user.isTeamLeader,
  });
  if (!allowed) {
    return NextResponse.json(
      {
        error:
          "전체일정으로 보내기 권한이 없습니다. 부서의 담당자에게 요청하세요.",
      },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = publishSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const dept =
    user.role === "ADMIN"
      ? parsed.data.dept || user.department
      : user.department;

  const where: {
    status: string;
    dept: string;
    id?: { in: number[] };
  } = {
    status: "DRAFT",
    dept,
  };

  if (parsed.data.ids && parsed.data.ids.length > 0) {
    where.id = { in: parsed.data.ids };
  }

  const drafts = await prisma.event.findMany({ where });
  if (drafts.length === 0) {
    return NextResponse.json(
      { error: "제출할 부서 초안 일정이 없습니다." },
      { status: 400 }
    );
  }

  const result = await prisma.event.updateMany({
    where: { id: { in: drafts.map((d) => d.id) }, status: "DRAFT", dept },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    publishedCount: result.count,
    dept,
  });
}
