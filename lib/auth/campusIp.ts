import { headers } from "next/headers";

/**
 * 일정 입력(등록·수정·삭제) 허용 IPv4 대역
 * 210.94.224.1 ~ 210.94.255.254
 */
const RANGE_START = ipv4ToInt("210.94.224.1");
const RANGE_END = ipv4ToInt("210.94.255.254");

export const CAMPUS_IP_RANGE_LABEL = "210.94.224.1 ~ 210.94.255.254";

export function ipv4ToInt(ip: string): number | null {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const v = Number(part);
    if (v < 0 || v > 255) return null;
    n = (n << 8) + v;
  }
  return n >>> 0;
}

/** IPv4만 검사. IPv6·잘못된 값은 거부 */
export function isCampusInputIp(ip: string | null | undefined): boolean {
  if (!ip) return false;
  const cleaned = ip.trim().replace(/^::ffff:/i, "");
  const n = ipv4ToInt(cleaned);
  if (n === null) return false;
  return n >= RANGE_START! && n <= RANGE_END!;
}

export function getClientIpFromHeaders(h: Headers): string | null {
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = h.get("x-real-ip")?.trim();
  if (real) return real;
  const vercel = h.get("x-vercel-forwarded-for")?.trim();
  if (vercel) {
    const first = vercel.split(",")[0]?.trim();
    if (first) return first;
  }
  return null;
}

export async function getRequestClientIp(): Promise<string | null> {
  const h = await headers();
  return getClientIpFromHeaders(h);
}

/**
 * 교내 IP 또는 로컬 개발 환경이면 입력 허용
 */
export async function canWriteScheduleFromRequest(): Promise<{
  allowed: boolean;
  ip: string | null;
}> {
  if (process.env.ALLOW_SCHEDULE_WRITE_ANY_IP === "1") {
    return { allowed: true, ip: "bypass" };
  }

  const ip = await getRequestClientIp();
  if (
    process.env.NODE_ENV === "development" &&
    (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("127."))
  ) {
    return { allowed: true, ip: ip || "127.0.0.1" };
  }

  return { allowed: isCampusInputIp(ip), ip };
}

export const CAMPUS_IP_DENIED_MESSAGE =
  `일정 입력은 교내망(${CAMPUS_IP_RANGE_LABEL})에서만 가능합니다.`;
