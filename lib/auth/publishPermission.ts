import { prisma } from "@/lib/prisma";

/** 해당 실무부서(department)에 맵상 팀장이 있는지 */
export async function deptHasMapLeader(department: string): Promise<boolean> {
  if (!department) return false;
  const count = await prisma.user.count({
    where: { department, isTeamLeader: true },
  });
  return count > 0;
}

/**
 * 전체일정 보내기 가능 여부
 * - ADMIN
 * - 로그인 시 팀장 선택
 * - 실무부서에 맵 팀장이 없으면 해당 부서 계정 모두 가능
 */
export async function resolveCanPublish(input: {
  role: string;
  department: string;
  isTeamLeader: boolean;
}): Promise<boolean> {
  if (input.role === "ADMIN") return true;
  if (input.isTeamLeader) return true;
  const hasLeader = await deptHasMapLeader(input.department);
  return !hasLeader;
}
