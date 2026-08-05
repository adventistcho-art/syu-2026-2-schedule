"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Trash2 } from "lucide-react";
import type { ScheduleEvent } from "@/lib/schedule/types";
import { formatPeriod, toDateKey } from "@/lib/schedule/types";
import {
  categoryColorClass,
  categoryLabel,
  displayAuthor,
  displayDept,
} from "@/lib/schedule/display";
import { canManageEvent } from "@/lib/schedule/permissions";
import { useWriteAccess } from "@/lib/schedule/useWriteAccess";
import EventEditDialog from "@/components/schedule/EventEditDialog";

type Props = {
  events: ScheduleEvent[];
  department: string;
  isAdmin: boolean;
  onSelectEvent: (event: ScheduleEvent) => void;
};

export default function EventTable({
  events,
  department,
  isAdmin,
  onSelectEvent,
}: Props) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ScheduleEvent | null>(null);
  const queryClient = useQueryClient();
  const { data: writeAccess } = useWriteAccess();
  const canWrite = Boolean(writeAccess?.allowed);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...events].sort((a, b) =>
      toDateKey(a.startDate).localeCompare(toDateKey(b.startDate))
    );
    if (!q) return list;
    return list.filter(
      (e) =>
        e.title.toLowerCase().includes(q) || e.dept.toLowerCase().includes(q)
    );
  }, [events, query]);

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
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">취합된 전체 일정 목록</h3>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="일정명/부서 검색..."
            className="w-64 max-w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">구분</th>
                <th className="text-left px-4 py-3 font-semibold">일정/행사명</th>
                <th className="text-left px-4 py-3 font-semibold">기간</th>
                <th className="text-left px-4 py-3 font-semibold">담당부서</th>
                <th className="text-left px-4 py-3 font-semibold">장소</th>
                <th className="text-left px-4 py-3 font-semibold">작성자</th>
                <th className="text-left px-4 py-3 font-semibold">관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ev) => {
                const canManage =
                  canWrite && canManageEvent(ev, department, isAdmin);
                return (
                  <tr
                    key={ev.id}
                    className="border-t border-slate-100 hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded ${categoryColorClass(ev.category)}`}
                      >
                        {categoryLabel(ev.category)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {ev.title}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatPeriod(ev.startDate, ev.endDate)}
                    </td>
                    <td className="px-4 py-3">{displayDept(ev)}</td>
                    <td className="px-4 py-3">{ev.location || "-"}</td>
                    <td className="px-4 py-3">{displayAuthor(ev)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
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
                              onClick={() => setEditing(ev)}
                              className="p-1.5 rounded border border-[#003366]/30 text-[#003366] hover:bg-blue-50"
                              title="수정"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm("해당 일정을 삭제하시겠습니까?")) {
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
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    검색 결과가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EventEditDialog
        event={editing}
        isAdmin={isAdmin}
        onClose={() => setEditing(null)}
      />
    </>
  );
}
