"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession, signOut } from "next-auth/react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ClipboardList,
  LogOut,
  Search,
  UserRound,
} from "lucide-react";
import { categoryLabel } from "@/lib/schedule/display";
import { formatPeriod } from "@/lib/schedule/types";

type DeptRow = {
  department: string;
  memberCount: number;
  leaders: string[];
  draftCount: number;
  publishedCount: number;
  authoredCount: number;
  status: "미작성" | "작성중" | "제출완료" | "작성중·제출완료";
  authors: {
    name: string;
    employeeId: string | null;
    draft: number;
    published: number;
  }[];
  lastActivityAt: string | null;
  lastPublishedAt: string | null;
};

type AuthorRow = {
  createdById: string | null;
  createdByName: string;
  department: string;
  draftCount: number;
  publishedCount: number;
  lastActivityAt: string | null;
  titles: string[];
};

type RecentEvent = {
  id: number;
  title: string;
  dept: string;
  status: string;
  category: string;
  createdById: string | null;
  createdByName: string | null;
  startDate: string;
  endDate: string;
  publishedAt: string | null;
  updatedAt: string;
};

type AdminPayload = {
  summary: {
    totalDepartments: number;
    notStarted: number;
    inProgress: number;
    submitted: number;
    totalDraft: number;
    totalPublishedAuthored: number;
    activeAuthors: number;
  };
  departments: DeptRow[];
  authors: AuthorRow[];
  recentEvents: RecentEvent[];
};

type ViewTab = "departments" | "authors" | "events";

async function fetchAdminStatus(): Promise<AdminPayload> {
  const res = await fetch("/api/admin/schedule-status", {
    credentials: "include",
    cache: "no-store",
  });
  if (res.status === 403) throw new Error("관리자만 접근할 수 있습니다.");
  if (!res.ok) throw new Error("취합 현황을 불러오지 못했습니다.");
  return res.json();
}

function statusBadgeClass(status: DeptRow["status"]) {
  switch (status) {
    case "제출완료":
      return "bg-emerald-100 text-emerald-800";
    case "작성중·제출완료":
      return "bg-sky-100 text-sky-800";
    case "작성중":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function formatDateTime(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ScheduleAdminPage() {
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<ViewTab>("departments");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | DeptRow["status"]>(
    "ALL"
  );

  const user = session?.user as
    | {
        name?: string | null;
        role?: "ADMIN" | "USER";
        department?: string;
      }
    | undefined;
  const isAdmin = user?.role === "ADMIN";

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "schedule-status"],
    queryFn: fetchAdminStatus,
    enabled: status === "authenticated" && isAdmin,
  });

  const filteredDepts = useMemo(() => {
    const list = data?.departments ?? [];
    const query = q.trim().toLowerCase();
    return list.filter((d) => {
      if (statusFilter !== "ALL" && d.status !== statusFilter) return false;
      if (!query) return true;
      const hay = [
        d.department,
        ...d.leaders,
        ...d.authors.map((a) => a.name),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [data?.departments, q, statusFilter]);

  const filteredAuthors = useMemo(() => {
    const list = data?.authors ?? [];
    const query = q.trim().toLowerCase();
    if (!query) return list;
    return list.filter((a) =>
      [a.createdByName, a.createdById ?? "", a.department, ...a.titles]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [data?.authors, q]);

  const filteredEvents = useMemo(() => {
    const list = data?.recentEvents ?? [];
    const query = q.trim().toLowerCase();
    if (!query) return list;
    return list.filter((e) =>
      [e.title, e.dept, e.createdByName ?? "", e.status]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [data?.recentEvents, q]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        세션 확인 중...
      </div>
    );
  }

  if (status === "unauthenticated" || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <a href="/login" className="text-[#003366] underline">
          로그인 페이지로 이동
        </a>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#f4f6f9]">
        <p className="text-slate-700 font-semibold">관리자만 접근할 수 있습니다.</p>
        <Link href="/schedule" className="text-[#003366] underline text-sm">
          일정 화면으로 돌아가기
        </Link>
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <header className="bg-gradient-to-r from-[#003366] to-[#001f3f] text-white shadow">
        <div className="max-w-[1400px] mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="w-6 h-6" />
              일정 취합 관리자
            </h1>
            <p className="text-sm text-white/70 mt-1">
              부서별 제출 현황 · 계정별 작성 내역
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/schedule"
              className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-white/30 hover:bg-white/10"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              일정으로
            </Link>
            <span className="bg-white/10 text-sm px-3 py-1.5 rounded-lg">
              {user.name} · {user.department} (관리자)
            </span>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-white/30 hover:bg-white/10"
            >
              <LogOut className="w-3.5 h-3.5" />
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
          {[
            {
              label: "대상 부서",
              value: summary?.totalDepartments ?? "-",
              icon: Building2,
            },
            {
              label: "미작성",
              value: summary?.notStarted ?? "-",
              icon: Building2,
            },
            {
              label: "작성중",
              value: summary?.inProgress ?? "-",
              icon: CalendarDays,
            },
            {
              label: "제출(반영) 부서",
              value: summary?.submitted ?? "-",
              icon: ClipboardList,
            },
            {
              label: "초안 건수",
              value: summary?.totalDraft ?? "-",
              icon: ClipboardList,
            },
            {
              label: "작성 계정 수",
              value: summary?.activeAuthors ?? "-",
              icon: UserRound,
            },
          ].map((c) => (
            <div
              key={c.label}
              className="bg-white rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-[#003366] p-4"
            >
              <p className="text-xs font-semibold text-slate-500">{c.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{c.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-2 mb-4 flex flex-wrap gap-2 items-center">
          {(
            [
              ["departments", "부서별 제출 현황"],
              ["authors", "계정별 작성"],
              ["events", "최근 작성 일정"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === key
                  ? "bg-[#003366] text-white"
                  : "text-[#003366] hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
          <div className="flex-1" />
          {tab === "departments" && (
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as typeof statusFilter)
              }
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="ALL">전체 상태</option>
              <option value="미작성">미작성</option>
              <option value="작성중">작성중</option>
              <option value="작성중·제출완료">작성중·제출완료</option>
              <option value="제출완료">제출완료</option>
            </select>
          )}
          <label className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="부서·이름·일정 검색"
              className="border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-sm w-52"
            />
          </label>
        </div>

        {isLoading && (
          <p className="text-sm text-slate-500 mb-4">현황 불러오는 중...</p>
        )}
        {error && (
          <p className="text-sm text-red-600 mb-4">{(error as Error).message}</p>
        )}

        {tab === "departments" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">부서</th>
                    <th className="text-left font-semibold px-4 py-3">상태</th>
                    <th className="text-right font-semibold px-4 py-3">초안</th>
                    <th className="text-right font-semibold px-4 py-3">
                      전체일정 반영
                    </th>
                    <th className="text-left font-semibold px-4 py-3">작성 계정</th>
                    <th className="text-left font-semibold px-4 py-3">맵 팀장</th>
                    <th className="text-left font-semibold px-4 py-3">최근 활동</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDepts.map((d) => (
                    <tr
                      key={d.department}
                      className="border-t border-slate-100 hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {d.department}
                        <span className="block text-xs text-slate-400 font-normal">
                          계정 {d.memberCount}명
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${statusBadgeClass(d.status)}`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {d.draftCount}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {d.publishedCount}
                      </td>
                      <td className="px-4 py-3">
                        {d.authors.length === 0 ? (
                          <span className="text-slate-400">-</span>
                        ) : (
                          <ul className="space-y-0.5">
                            {d.authors.slice(0, 4).map((a) => (
                              <li key={`${a.employeeId}-${a.name}`}>
                                <span className="font-medium">{a.name}</span>
                                <span className="text-slate-400 text-xs ml-1">
                                  초안 {a.draft} · 반영 {a.published}
                                </span>
                              </li>
                            ))}
                            {d.authors.length > 4 && (
                              <li className="text-xs text-slate-400">
                                외 {d.authors.length - 4}명
                              </li>
                            )}
                          </ul>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {d.leaders.length ? d.leaders.join(", ") : "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {formatDateTime(d.lastActivityAt)}
                      </td>
                    </tr>
                  ))}
                  {filteredDepts.length === 0 && !isLoading && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-slate-400"
                      >
                        조건에 맞는 부서가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "authors" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">이름</th>
                    <th className="text-left font-semibold px-4 py-3">계정</th>
                    <th className="text-left font-semibold px-4 py-3">부서</th>
                    <th className="text-right font-semibold px-4 py-3">초안</th>
                    <th className="text-right font-semibold px-4 py-3">반영</th>
                    <th className="text-left font-semibold px-4 py-3">최근 일정</th>
                    <th className="text-left font-semibold px-4 py-3">최근 활동</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuthors.map((a) => (
                    <tr
                      key={`${a.createdById}-${a.createdByName}-${a.department}`}
                      className="border-t border-slate-100 hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-3 font-medium">{a.createdByName}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {a.createdById ?? "-"}
                      </td>
                      <td className="px-4 py-3">{a.department}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {a.draftCount}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {a.publishedCount}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs">
                        {a.titles.length ? a.titles.join(" · ") : "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {formatDateTime(a.lastActivityAt)}
                      </td>
                    </tr>
                  ))}
                  {filteredAuthors.length === 0 && !isLoading && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-slate-400"
                      >
                        작성 내역이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "events" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">일정</th>
                    <th className="text-left font-semibold px-4 py-3">부서</th>
                    <th className="text-left font-semibold px-4 py-3">작성자</th>
                    <th className="text-left font-semibold px-4 py-3">구분</th>
                    <th className="text-left font-semibold px-4 py-3">상태</th>
                    <th className="text-left font-semibold px-4 py-3">기간</th>
                    <th className="text-left font-semibold px-4 py-3">수정</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((e) => (
                    <tr
                      key={e.id}
                      className="border-t border-slate-100 hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-3 font-medium">{e.title}</td>
                      <td className="px-4 py-3">{e.dept}</td>
                      <td className="px-4 py-3">
                        {e.createdByName ?? "-"}
                        {e.createdById && (
                          <span className="block text-xs text-slate-400">
                            {e.createdById}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">{categoryLabel(e.category)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${
                            e.status === "PUBLISHED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          {e.status === "PUBLISHED" ? "전체일정 반영" : "부서 초안"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {formatPeriod(e.startDate, e.endDate)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {formatDateTime(e.updatedAt)}
                      </td>
                    </tr>
                  ))}
                  {filteredEvents.length === 0 && !isLoading && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-slate-400"
                      >
                        표시할 일정이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-500 mt-4">
          · 「제출」은 부서 초안을 전체일정으로 보낸(PUBLISHED) 건입니다. ·
          공식 학사력·공휴일·시스템 작성은 취합 현황에서 제외됩니다.
        </p>
      </main>
    </div>
  );
}
