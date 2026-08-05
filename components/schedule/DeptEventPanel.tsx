"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Trash2 } from "lucide-react";
import type { ScheduleEvent } from "@/lib/schedule/types";
import { formatPeriod, toDateKey } from "@/lib/schedule/types";
import { displayAuthor } from "@/lib/schedule/display";
import { canManageEvent } from "@/lib/schedule/permissions";

type Props = {
  department: string;
  isAdmin: boolean;
  onSelectEvent: (event: ScheduleEvent) => void;
  onEditEvent: (event: ScheduleEvent) => void;
};

async function fetchDeptEvents(dept: string): Promise<ScheduleEvent[]> {
  const params = new URLSearchParams({
    status: "PUBLISHED",
    dept,
  });
  const res = await fetch(`/api/events?${params}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("부서 일정을 불러오지 못했습니다.");
  return res.json();
}

export default function DeptEventPanel({
  department,
  isAdmin,
  onSelectEvent,
  onEditEvent,
}: Props) {
  const queryClient = useQueryClient();

  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ["events", "dept", department],
    queryFn: () => fetchDeptEvents(department),
    enabled: Boolean(department),
  });

  const sorted = [...events].sort((a, b) =>
    toDateKey(a.startDate).localeCompare(toDateKey(b.startDate))
  );

  const delMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "삭제 실패");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });

  return (
    <div className="max-w-3xl mx-auto mt-5 bg-white rounded-xl shadow-sm border border-slate-100">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="font-bold text-slate-800">
          {department} 등록 일정
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          이 실무부서로 등록된 일정입니다. 다른 담당자가 작성한 일정도 함께
          표시됩니다.
        </p>
      </div>

      {isLoading && (
        <p className="px-5 py-8 text-sm text-slate-400 text-center">
          일정 불러오는 중...
        </p>
      )}
      {error && (
        <p className="px-5 py-8 text-sm text-red-600 text-center">
          {(error as Error).message}
        </p>
      )}
      {!isLoading && !error && sorted.length === 0 && (
        <p className="px-5 py-8 text-sm text-slate-400 text-center">
          아직 등록된 일정이 없습니다. 위에서 일정을 추가하세요.
        </p>
      )}

      {sorted.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {sorted.map((ev) => {
            const canManage = canManageEvent(ev, department, isAdmin);
            return (
              <li
                key={ev.id}
                className="px-5 py-3 flex flex-wrap items-start justify-between gap-3 hover:bg-slate-50/80"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800">{ev.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatPeriod(ev.startDate, ev.endDate)}
                    {ev.location ? ` · ${ev.location}` : ""}
                    {" · "}
                    작성 {displayAuthor(ev)}
                  </p>
                  {ev.description && (
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 whitespace-pre-wrap">
                      {ev.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelectEvent(ev)}
                    className="p-1.5 rounded border border-sky-200 text-sky-700 hover:bg-sky-50"
                    title="상세"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={() => onEditEvent(ev)}
                        className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100"
                        title="수정"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={delMutation.isPending}
                        onClick={() => {
                          if (confirm("이 일정을 삭제할까요?")) {
                            delMutation.mutate(ev.id);
                          }
                        }}
                        className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
