import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  CAMPUS_IP_RANGE_LABEL,
  canWriteScheduleFromRequest,
} from "@/lib/auth/campusIp";

/**
 * GET /api/events/write-access
 * 현재 요청 IP로 일정 입력(등록·수정·삭제) 가능 여부
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed, ip } = await canWriteScheduleFromRequest();
  return NextResponse.json({
    allowed,
    ip,
    range: CAMPUS_IP_RANGE_LABEL,
  });
}
