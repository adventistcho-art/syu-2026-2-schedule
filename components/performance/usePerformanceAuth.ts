"use client";

import { useSession } from "next-auth/react";

export type PerformanceAuthUser = {
  userId: string;
  username: string;
  name: string;
  role: "user" | "admin" | "manager";
  deptName?: string;
};

type SessionUserExtra = {
  id?: string;
  employeeId?: string;
  role?: "ADMIN" | "USER";
  department?: string;
  name?: string | null;
};

/** 성과관리 화면용 세션 로드 (NextAuth 연동) */
export function usePerformanceAuth() {
  const { data, status } = useSession();
  const checked = status !== "loading";
  const raw = data?.user as SessionUserExtra | undefined;

  const user: PerformanceAuthUser | null =
    status === "authenticated" && raw?.id && raw.employeeId
      ? {
          userId: raw.id,
          username: raw.employeeId,
          name: raw.name ?? "",
          role: raw.role === "ADMIN" ? "admin" : "user",
          deptName: raw.department ?? "",
        }
      : null;

  return {
    user,
    checked,
    isAdmin: user?.role === "admin",
  };
}
