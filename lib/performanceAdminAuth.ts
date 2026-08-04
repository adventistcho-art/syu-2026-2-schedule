import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

/** 성과관리 관리자 API용 — role=ADMIN만 허용 */
export async function requirePerfAdmin() {
  const user = await getSessionUser();
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }),
    };
  }

  if (user.role !== "ADMIN") {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "관리자만 접근할 수 있습니다." }, { status: 403 }),
    };
  }

  return { ok: true as const, user };
}
