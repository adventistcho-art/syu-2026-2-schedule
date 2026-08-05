"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { CalendarDays, ClipboardList, LogOut } from "lucide-react";
import StatCards from "@/components/schedule/StatCards";
import SemesterCalendar from "@/components/schedule/SemesterCalendar";
import EventForm from "@/components/schedule/EventForm";
import DeptEventPanel from "@/components/schedule/DeptEventPanel";
import EventTable from "@/components/schedule/EventTable";
import EventDetailDialog from "@/components/schedule/EventDetailDialog";
import EventEditDialog from "@/components/schedule/EventEditDialog";
import type { ScheduleEvent } from "@/lib/schedule/types";
import { SOURCE_URL } from "@/lib/schedule/constants";

type TabKey = "dashboard" | "input" | "list";

async function fetchPublishedEvents(): Promise<ScheduleEvent[]> {
  const res = await fetch("/api/events?status=PUBLISHED", {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("일정을 불러오지 못했습니다.");
  return res.json();
}

export default function SchedulePage() {
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [selected, setSelected] = useState<ScheduleEvent | null>(null);
  const [editing, setEditing] = useState<ScheduleEvent | null>(null);

  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ["events", "published"],
    queryFn: fetchPublishedEvents,
    enabled: status === "authenticated",
  });

  const user = session?.user as
    | {
        name?: string | null;
        role?: "ADMIN" | "USER";
        department?: string;
      }
    | undefined;
  const isAdmin = user?.role === "ADMIN";
  const department = user?.department ?? "";
  const [adminDept, setAdminDept] = useState("");

  useEffect(() => {
    if (department) setAdminDept((prev) => prev || department);
  }, [department]);

  const tabs = useMemo(
    () =>
      [
        { key: "dashboard" as const, label: "통합 대시보드 & 캘린더" },
        { key: "input" as const, label: "부서별 일정 등록" },
        { key: "list" as const, label: "전체 일정 목록" },
      ] as const,
    []
  );

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

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <header className="bg-gradient-to-r from-[#003366] to-[#001f3f] text-white shadow">
        <div className="max-w-[1400px] mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <CalendarDays className="w-6 h-6" />
              삼육대학교 2026학년도 2학기 일정 통합 관리
            </h1>
            <p className="text-sm text-white/70 mt-1">
              2026.09 ~ 2027.02 · 공식 학사력 연동 및 부서별 일정 등록
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                href="/schedule/admin"
                className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-white/30 hover:bg-white/10"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                취합 현황
              </Link>
            )}
            <span className="bg-white/10 text-sm px-3 py-1.5 rounded-lg">
              {user.name} · {department}
              {isAdmin ? " (관리자)" : ""}
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
        <div className="bg-white rounded-xl shadow-sm p-2 mb-5 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === t.key
                  ? "bg-[#003366] text-white"
                  : "text-[#003366] hover:bg-slate-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <p className="text-sm text-slate-500 mb-4">일정 불러오는 중...</p>
        )}
        {error && (
          <p className="text-sm text-red-600 mb-4">{(error as Error).message}</p>
        )}

        {tab === "dashboard" && (
          <>
            <StatCards events={events} />
            <p className="text-xs text-slate-500 mb-3">
              기본 학사력 출처:{" "}
              <a
                href={SOURCE_URL}
                target="_blank"
                rel="noreferrer"
                className="text-[#003366] underline"
              >
                학사주요일정
              </a>
            </p>
            <SemesterCalendar
              events={events}
              onSelectEvent={setSelected}
            />
          </>
        )}

        {tab === "input" && (
          <div>
            {isAdmin && (
              <div className="max-w-3xl mx-auto mb-4 flex items-center gap-2 text-sm">
                <label className="font-semibold text-slate-700">작업 부서</label>
                <select
                  value={adminDept || department}
                  onChange={(e) => setAdminDept(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-1.5"
                >
                  {[
                    "교무처",
                    "교목처",
                    "학생복지처",
                    "입학처",
                    "기획처",
                    department,
                  ]
                    .filter((v, i, a) => v && a.indexOf(v) === i)
                    .map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                </select>
              </div>
            )}
            <EventForm
              department={isAdmin ? adminDept || department : department}
              isAdmin={!!isAdmin}
            />
            <DeptEventPanel
              department={isAdmin ? adminDept || department : department}
              isAdmin={!!isAdmin}
              onSelectEvent={setSelected}
              onEditEvent={setEditing}
            />
          </div>
        )}

        {tab === "list" && (
          <EventTable
            events={events}
            department={department}
            isAdmin={!!isAdmin}
            onSelectEvent={setSelected}
          />
        )}
      </main>

      <EventDetailDialog
        event={selected}
        department={department}
        isAdmin={!!isAdmin}
        onClose={() => setSelected(null)}
        onEdit={(ev) => {
          setSelected(null);
          setEditing(ev);
        }}
      />
      <EventEditDialog
        event={editing}
        isAdmin={!!isAdmin}
        onClose={() => setEditing(null)}
        onSaved={(ev) => setSelected(ev)}
      />
    </div>
  );
}
