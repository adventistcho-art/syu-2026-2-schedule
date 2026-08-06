import type { ScheduleEvent } from "@/lib/schedule/types";

export type DeptOption = {
  phoneParent: string;
  phoneDept: string;
  label: string;
  value: string;
};

/** 로그인 콤보와 동일한 부서 옵션으로 일정 담당부서 매칭 */
export function eventMatchesDept(
  event: ScheduleEvent,
  opt: DeptOption | null
): boolean {
  if (!opt) return true;
  const d = (event.dept || "").trim();
  if (!d) return false;
  if (d === opt.phoneDept) return true;
  if (d === opt.label) return true;
  if (d === `${opt.phoneDept}(${opt.phoneParent})`) return true;
  if (d === opt.phoneParent && opt.phoneDept === opt.phoneParent) return true;
  return false;
}

export async function fetchDeptOptions(): Promise<DeptOption[]> {
  const res = await fetch("/api/login/dept-options", { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.options ?? [];
}
