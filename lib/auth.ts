import { auth } from "@/auth";
import { resolveCanPublish } from "@/lib/auth/publishPermission";

export type AppUser = {
  id: string;
  name: string;
  employeeId: string;
  role: "ADMIN" | "USER";
  department: string;
  /** 로그인 시 선택한 팀장/팀원 (맵과 무관) */
  isTeamLeader: boolean;
  /** 전체일정 보내기 가능 여부 */
  canPublishToOverall: boolean;
};

export { deptHasMapLeader, resolveCanPublish } from "@/lib/auth/publishPermission";

export async function getSessionUser(): Promise<AppUser | null> {
  const session = await auth();
  if (!session?.user) return null;

  const user = session.user as {
    id?: string;
    name?: string | null;
    employeeId?: string;
    role?: "ADMIN" | "USER";
    department?: string;
    isTeamLeader?: boolean;
    canPublishToOverall?: boolean;
  };

  if (!user.id || !user.employeeId || !user.department || !user.role) {
    return null;
  }

  const isTeamLeader = Boolean(user.isTeamLeader);
  const canPublish =
    typeof user.canPublishToOverall === "boolean"
      ? user.canPublishToOverall
      : await resolveCanPublish({
          role: user.role,
          department: user.department,
          isTeamLeader,
        });

  return {
    id: user.id,
    name: user.name ?? "",
    employeeId: user.employeeId,
    role: user.role,
    department: user.department,
    isTeamLeader,
    canPublishToOverall: canPublish,
  };
}

/** 동기 판정(세션에 이미 계산된 값 기준). API에서는 resolveCanPublish 재검증 권장 */
export function canPublishToOverall(user: AppUser): boolean {
  return user.canPublishToOverall;
}

export async function isAdmin() {
  const user = await getSessionUser();
  return user?.role === "ADMIN";
}

export async function belongsToDepartment(department: string) {
  const user = await getSessionUser();
  return user?.department === department;
}
