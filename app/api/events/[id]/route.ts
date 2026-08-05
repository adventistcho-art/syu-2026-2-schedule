import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import {
  CAMPUS_IP_DENIED_MESSAGE,
  canWriteScheduleFromRequest,
} from "@/lib/auth/campusIp";
import { createEventSchema } from "@/lib/schedule/schemas";

function parseDayStart(dateStr: string) {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function parseDayEnd(dateStr: string) {
  return new Date(`${dateStr}T23:59:59.999Z`);
}

function canManage(
  user: { role: string; department: string },
  eventDept: string
) {
  return user.role === "ADMIN" || user.department === eventDept;
}

/** PATCH /api/events/:id — 일정 수정 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const writeAccess = await canWriteScheduleFromRequest();
  if (!writeAccess.allowed) {
    return NextResponse.json(
      { error: CAMPUS_IP_DENIED_MESSAGE, ip: writeAccess.ip },
      { status: 403 }
    );
  }

  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canManage(user, existing.dept)) {
    return NextResponse.json(
      { error: "본인 부서 일정만 수정할 수 있습니다." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createEventSchema.safeParse({
    ...(body as object),
    dept:
      user.role === "ADMIN"
        ? (body as { dept?: string }).dept ?? existing.dept
        : existing.dept,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const dept = user.role === "ADMIN" ? data.dept : existing.dept;

  const event = await prisma.event.update({
    where: { id },
    data: {
      title: data.title,
      category: data.category,
      dept,
      startDate: parseDayStart(data.startDate),
      endDate: parseDayEnd(data.endDate),
      location: data.location || null,
      description: data.description || null,
    },
  });

  return NextResponse.json(event);
}

/** DELETE /api/events/:id */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const writeAccess = await canWriteScheduleFromRequest();
  if (!writeAccess.allowed) {
    return NextResponse.json(
      { error: CAMPUS_IP_DENIED_MESSAGE, ip: writeAccess.ip },
      { status: 403 }
    );
  }

  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canManage(user, event.dept)) {
    return NextResponse.json(
      { error: "본인 부서 일정만 삭제할 수 있습니다." },
      { status: 403 }
    );
  }

  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
