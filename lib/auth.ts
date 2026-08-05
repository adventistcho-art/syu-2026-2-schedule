import { auth } from "@/auth";
import { resolveCanPublish } from "@/lib/auth/publishPermission";

export type AppUser = {
  id: string;
  name: string;
  employeeId: string;
  role: "ADMIN" | "USER";
  department: string;
  /** 전화번호부 F열 기준 전체일정 게시 권한 */
  isTeamLeader: boolean;
  canPublishToOverall: boolean;
};

export { resolveCanPublish } from "@/lib/auth/publishPermission";

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
