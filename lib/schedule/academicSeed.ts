import type { EventCategory } from "./constants";
import { SOURCE_URL } from "./constants";

type SeedEvent = {
  title: string;
  category: EventCategory;
  dept: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  location?: string;
  contact?: string;
  description?: string;
};

const CONTACT = "02-3399-3153";
const DEPT = "교무처";
/** 공휴일·국경일 — 구분은 category=HOLIDAY(표시: 공휴일), 담당부서는 비움 */
const HOLIDAY_DEPT = "";
const DESC = `출처: ${SOURCE_URL}`;

/** 공식 학사주요일정 2026.09 ~ 2027.02 */
export const OFFICIAL_ACADEMIC_EVENTS: SeedEvent[] = [
  { title: "개강", category: "ACADEMIC", dept: DEPT, startDate: "2026-09-01", endDate: "2026-09-01", contact: CONTACT, description: DESC },
  { title: "수강신청 확인 및 정정 기간(1주차)", category: "ACADEMIC", dept: DEPT, startDate: "2026-09-01", endDate: "2026-09-07", contact: CONTACT, description: DESC },
  { title: "수강 중도포기(4주차)", category: "ACADEMIC", dept: DEPT, startDate: "2026-09-21", endDate: "2026-09-23", contact: CONTACT, description: DESC },
  { title: "추석", category: "HOLIDAY", dept: HOLIDAY_DEPT, startDate: "2026-09-24", endDate: "2026-09-27", description: DESC },
  { title: "개천절", category: "HOLIDAY", dept: HOLIDAY_DEPT, startDate: "2026-10-03", endDate: "2026-10-03", description: DESC },
  { title: "대체휴일", category: "HOLIDAY", dept: HOLIDAY_DEPT, startDate: "2026-10-05", endDate: "2026-10-05", description: DESC },
  { title: "천보축전", category: "STUDENT", dept: "학생복지처", startDate: "2026-10-06", endDate: "2026-10-06", description: DESC },
  { title: "체육대회", category: "STUDENT", dept: "학생복지처", startDate: "2026-10-07", endDate: "2026-10-07", description: DESC },
  { title: "한글날", category: "HOLIDAY", dept: HOLIDAY_DEPT, startDate: "2026-10-09", endDate: "2026-10-09", description: DESC },
  { title: "개교기념일", category: "HOLIDAY", dept: HOLIDAY_DEPT, startDate: "2026-10-10", endDate: "2026-10-10", description: DESC },
  { title: "중간강의평가(7주차)", category: "ACADEMIC", dept: DEPT, startDate: "2026-10-13", endDate: "2026-10-30", contact: CONTACT, description: DESC },
  { title: "중간고사(8주차)", category: "ACADEMIC", dept: DEPT, startDate: "2026-10-20", endDate: "2026-10-26", contact: CONTACT, description: DESC },
  { title: "온라인수업 권장주간", category: "ACADEMIC", dept: DEPT, startDate: "2026-10-27", endDate: "2026-11-02", contact: CONTACT, description: DESC },
  { title: "중간고사 성적입력기간", category: "ACADEMIC", dept: DEPT, startDate: "2026-10-27", endDate: "2026-11-02", contact: CONTACT, description: DESC },
  { title: "사랑나눔축제", category: "CHAPEL", dept: "교목처", startDate: "2026-11-09", endDate: "2026-11-12", description: DESC },
  { title: "대학수학능력시험", category: "ADMISSION", dept: "입학처", startDate: "2026-11-19", endDate: "2026-11-19", description: DESC },
  { title: "논술고사", category: "ADMISSION", dept: "입학처", startDate: "2026-11-23", endDate: "2026-11-24", description: DESC },
  { title: "계절학기 수강신청", category: "ACADEMIC", dept: DEPT, startDate: "2026-11-23", endDate: "2026-11-25", contact: CONTACT, description: DESC },
  { title: "기말고사(15주차)", category: "ACADEMIC", dept: DEPT, startDate: "2026-12-08", endDate: "2026-12-14", contact: CONTACT, description: DESC },
  { title: "성적입력기간", category: "ACADEMIC", dept: DEPT, startDate: "2026-12-08", endDate: "2026-12-21", contact: CONTACT, description: DESC },
  { title: "교수협의회", category: "DEPT", dept: DEPT, startDate: "2026-12-15", endDate: "2026-12-15", contact: CONTACT, description: DESC },
  { title: "동계계절학기", category: "ACADEMIC", dept: DEPT, startDate: "2026-12-21", endDate: "2027-01-12", contact: CONTACT, description: DESC },
  { title: "성적확인 및 정정기간", category: "ACADEMIC", dept: DEPT, startDate: "2026-12-22", endDate: "2026-12-28", contact: CONTACT, description: DESC },
  { title: "성탄절", category: "HOLIDAY", dept: HOLIDAY_DEPT, startDate: "2026-12-25", endDate: "2026-12-25", description: DESC },
  { title: "종무식", category: "DEPT", dept: DEPT, startDate: "2026-12-31", endDate: "2026-12-31", contact: CONTACT, description: DESC },
  { title: "신정", category: "HOLIDAY", dept: HOLIDAY_DEPT, startDate: "2027-01-01", endDate: "2027-01-01", description: DESC },
  { title: "신년 교례회 및 시무식", category: "DEPT", dept: DEPT, startDate: "2027-01-04", endDate: "2027-01-04", contact: CONTACT, description: DESC },
  { title: "교역자계절대학", category: "DEPT", dept: "교목처", startDate: "2027-01-04", endDate: "2027-01-15", description: DESC },
  { title: "계절학기 성적입력기간", category: "ACADEMIC", dept: DEPT, startDate: "2027-01-07", endDate: "2027-01-12", contact: CONTACT, description: DESC },
  { title: "계절학기 성적확인 및 정정기간", category: "ACADEMIC", dept: DEPT, startDate: "2027-01-13", endDate: "2027-01-13", contact: CONTACT, description: DESC },
  { title: "졸업사정회", category: "ACADEMIC", dept: DEPT, startDate: "2027-01-25", endDate: "2027-01-25", contact: CONTACT, description: DESC },
  { title: "예비수강신청", category: "ACADEMIC", dept: DEPT, startDate: "2027-02-01", endDate: "2027-02-03", contact: CONTACT, description: DESC },
  { title: "설날", category: "HOLIDAY", dept: HOLIDAY_DEPT, startDate: "2027-02-06", endDate: "2027-02-08", description: DESC },
  { title: "대체휴일", category: "HOLIDAY", dept: HOLIDAY_DEPT, startDate: "2027-02-09", endDate: "2027-02-09", description: DESC },
  { title: "전기 학위수여식", category: "ACADEMIC", dept: DEPT, startDate: "2027-02-12", endDate: "2027-02-12", location: "대강당", contact: CONTACT, description: DESC },
  { title: "본수강신청", category: "ACADEMIC", dept: DEPT, startDate: "2027-02-15", endDate: "2027-02-17", contact: CONTACT, description: DESC },
  { title: "재학생 등록기간", category: "ACADEMIC", dept: DEPT, startDate: "2027-02-17", endDate: "2027-02-23", contact: CONTACT, description: DESC },
  { title: "MVP CAMP(1차)", category: "DEPT", dept: DEPT, startDate: "2027-02-17", endDate: "2027-02-19", contact: CONTACT, description: DESC },
  { title: "교직원 영성축제", category: "CHAPEL", dept: "교목처", startDate: "2027-02-22", endDate: "2027-02-25", description: DESC },
  { title: "교수협의회", category: "DEPT", dept: DEPT, startDate: "2027-02-22", endDate: "2027-02-23", contact: CONTACT, description: DESC },
  { title: "MVP CAMP(2차)", category: "DEPT", dept: DEPT, startDate: "2027-02-22", endDate: "2027-02-24", contact: CONTACT, description: DESC },
  { title: "편입생 오리엔테이션", category: "ADMISSION", dept: "입학처", startDate: "2027-02-24", endDate: "2027-02-24", description: DESC },
  { title: "BFFL 세미나", category: "DEPT", dept: DEPT, startDate: "2027-02-24", endDate: "2027-02-25", contact: CONTACT, description: DESC },
  { title: "신입생·편입생 수강신청", category: "ACADEMIC", dept: DEPT, startDate: "2027-02-25", endDate: "2027-02-26", contact: CONTACT, description: DESC },
  { title: "휴·복학 만기일", category: "ACADEMIC", dept: DEPT, startDate: "2027-02-26", endDate: "2027-02-26", contact: CONTACT, description: DESC },
];

/**
 * 관리자 = 전화번호부 계정과 동일 인물 (기획처 기획팀 조재림 3395)
 * employeeId는 시드 시 phonebook JSON의 pb_* 와 맞춰 승격합니다.
 */
export const ADMIN_IDENTITY = {
  name: "조재림",
  phoneParent: "기획처",
  phoneDept: "기획팀",
  phoneExt: "3395",
} as const;
