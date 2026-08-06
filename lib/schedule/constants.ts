export type EventCategory =
  | "ACADEMIC"
  | "CHAPEL"
  | "STUDENT"
  | "ADMISSION"
  | "DEPT"
  | "HOLIDAY";

export const CATEGORY_LABEL: Record<EventCategory, string> = {
  ACADEMIC: "학사일정",
  CHAPEL: "교목/영성",
  STUDENT: "학생행사",
  ADMISSION: "입학/채용",
  DEPT: "일반부서",
  HOLIDAY: "공휴일",
};

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  ACADEMIC: "bg-[#003366] text-white",
  CHAPEL: "bg-[#2b8a3e] text-white",
  STUDENT: "bg-[#e8590c] text-white",
  ADMISSION: "bg-[#6741d9] text-white",
  DEPT: "bg-[#0f766e] text-white",
  HOLIDAY: "bg-red-600 text-white",
};

export const SEMESTER_START = new Date(2026, 8, 1); // 2026-09
export const SEMESTER_END = new Date(2027, 1, 28); // 2027-02

export const SOURCE_URL = "https://www.syu.ac.kr/academic/major-schedule/";
