import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const indexes = await prisma.compositeIndex.findMany({
      include: {
        components: {
          include: {
            subIndicators: true,
            trendData: { orderBy: { year: "asc" } },
          },
          orderBy: { id: "asc" },
        },
        trendData: { orderBy: { year: "asc" } },
        sessions: true,
      },
      orderBy: { id: "asc" },
    });
    return NextResponse.json(indexes);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "DB 조회 실패" }, { status: 500 });
  }
}
