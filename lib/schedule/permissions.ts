import type { ScheduleEvent } from "./types";

/** 본인 부서(또는 관리자) 일정은 수정·삭제 가능 */
export function canManageEvent(
  event: Pick<ScheduleEvent, "dept">,
  department: string,
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;
  return !!department && event.dept === department;
}
