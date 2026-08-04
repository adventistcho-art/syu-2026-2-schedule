import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { createEventSchema } from "@/lib/schedule/schemas";

function parseDayStart(dateStr: string) {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function parseDayEnd(dateStr: string) {
  return new Date(`${dateStr}T23:59:59.999Z`);
}

/**
 * GET /api/events
 * query: status=PUBLISHED|DRAFT|ALL (default PUBLISHED)
 *        dept=부서명
 *        year=&month=&category=
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const category = searchParams.get("category");
  const status = searchParams.get("status") ?? "PUBLISHED";
  const dept = searchParams.get("dept");

  const where: {
    category?: string;
    status?: string;
    dept?: string;
    AND?: Array<{ startDate?: { lte: Date }; endDate?: { gte: Date } }>;
  } = {};

  if (status !== "ALL") {
    where.status = status;
  }

  if (dept) {
    // 일반 사용자는 본인 부서 DRAFT만 조회 가능
    if (user.role !== "ADMIN" && dept !== user.department && status === "DRAFT") {
      return NextResponse.json(
        { error: "본인 부서 초안만 조회할 수 있습니다." },
        { status: 403 }
      );
    }
    where.dept = dept;
  } else if (status === "DRAFT" && user.role !== "ADMIN") {
    where.dept = user.department;
  }

  if (category && category !== "ALL") {
    where.category = category;
  }

  if (year && month) {
    const y = Number(year);
    const m = Number(month);
    if (!Number.isNaN(y) && !Number.isNaN(m) && m >= 1 && m <= 12) {
      const rangeStart = new Date(Date.UTC(y, m - 1, 1));
      const rangeEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
      where.AND = [
        { startDate: { lte: rangeEnd } },
        { endDate: { gte: rangeStart } },
      ];
    }
  }

  const events = await prisma.event.findMany({
    where,
    orderBy: [{ startDate: "asc" }, { id: "asc" }],
  });

  return NextResponse.json(events);
}

/** POST /api/events — 부서 초안(DRAFT)으로 등록 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const dept = user.role === "ADMIN" ? data.dept : user.department;

  const event = await prisma.event.create({
    data: {
      title: data.title,
      category: data.category,
      dept,
      startDate: parseDayStart(data.startDate),
      endDate: parseDayEnd(data.endDate),
      location: data.location || null,
      contact: null,
      description: data.description || null,
      status: "DRAFT",
      createdById: user.employeeId,
      createdByName: user.name,
    },
  });

  return NextResponse.json(event, { status: 201 });
}
