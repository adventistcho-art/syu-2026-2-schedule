import {
  CATEGORY_COLORS,
  CATEGORY_LABEL,
  type EventCategory,
} from "./constants";
import type { ScheduleEvent } from "./types";

const NON_DEPT_LABELS = new Set([
  "국공휴일",
  "국경일",
  "공휴일",
  "삼육대학교",
  "-",
]);

const SYSTEM_AUTHORS = new Set(["공식 학사력", "system", "시스템"]);

export function categoryLabel(category: string): string {
  return CATEGORY_LABEL[category as EventCategory] ?? category;
}

export function categoryColorClass(category: string): string {
  return (
    CATEGORY_COLORS[category as EventCategory] ?? "bg-slate-500 text-white"
  );
}

/** 담당부서: 실제 부서명만 (공휴일/구분성 값 제외) */
export function displayDept(event: Pick<ScheduleEvent, "dept" | "category">): string {
  if (event.category === "HOLIDAY") return "-";
  const dept = (event.dept || "").trim();
  if (!dept || NON_DEPT_LABELS.has(dept)) return "-";
  return dept;
}

/** 작성자: 실제 담당자명만 (공식 시드/시스템 제외) */
export function displayAuthor(
  event: Pick<ScheduleEvent, "createdByName" | "createdById">
): string {
  const name = (event.createdByName || "").trim();
  if (!name || SYSTEM_AUTHORS.has(name)) return "-";
  if (event.createdById === "system") return "-";
  return name;
}
