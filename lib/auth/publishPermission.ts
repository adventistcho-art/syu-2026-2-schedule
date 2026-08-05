/**
 * 전체일정 보내기 가능 여부
 * - ADMIN
 * - 전화번호부 F열 지정자 (User.isTeamLeader = canPublish 플래그로 시드)
 */
export async function resolveCanPublish(input: {
  role: string;
  isTeamLeader: boolean;
}): Promise<boolean> {
  if (input.role === "ADMIN") return true;
  return Boolean(input.isTeamLeader);
}
