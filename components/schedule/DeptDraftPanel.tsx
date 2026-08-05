"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Send, Trash2, UserRound, X } from "lucide-react";
import type { ScheduleEvent } from "@/lib/schedule/types";
import { formatPeriod, toDateKey } from "@/lib/schedule/types";
import { CATEGORY_COLORS, CATEGORY_LABEL } from "@/lib/schedule/constants";
import EventEditDialog from "@/components/schedule/EventEditDialog";

type Props = {
  department: string;
  isAdmin: boolean;
  /** 전화번호부 F열 지정자 또는 관리자 */
  canPublish: boolean;
};

async function fetchDeptDrafts(dept: string): Promise<ScheduleEvent[]> {
  const params = new URLSearchParams({ status: "DRAFT", dept });
  const res = await fetch(`/api/events?${params}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("부서 초안을 불러오지 못했습니다.");
  return res.json();
}

export default function DeptDraftPanel({
  department,
  isAdmin,
  canPublish,
}: Props) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<ScheduleEvent | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: drafts = [], isLoading } = useQuery({
    queryKey: ["events", "draft", department],
    queryFn: () => fetchDeptDrafts(department),
    enabled: !!department,
  });

  const grouped = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    const sorted = [...drafts].sort((a, b) =>
      toDateKey(a.startDate).localeCompare(toDateKey(b.startDate))
    );
    for (const ev of sorted) {
      const key = ev.createdByName || "미지정 담당자";
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [drafts]);

  const allIds = drafts.map((d) => d.id);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selected.includes(id));
  const pendingIds = selected.length > 0 ? selected : allIds;

  const toggleAll = () => {
    setSelected(allSelected ? [] : allIds);
  };

  const toggleOne = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const publishMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await fetch("/api/events/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: ids.length > 0 ? ids : undefined,
          dept: department,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "제출 실패");
      return data as { publishedCount: number };
    },
    onSuccess: async (data) => {
      setSelected([]);
      setConfirmOpen(false);
      setMessage(`${data.publishedCount}건을 전체일정으로 제출했습니다.`);
      await queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (err) => {
      setMessage((err as Error).message);
      setConfirmOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "삭제 실패");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  return (
    <div className="max-w-3xl mx-auto mt-6 bg-white rounded-xl shadow-sm border border-slate-100">
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-800">
            {department} 부서 취합 일정 (초안)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            담당자가 등록한 일정이 아래에 모입니다. 전화번호부에 「전체일정으로
            보내기」로 지정된 분만 전체일정으로 제출할 수 있습니다.
          </p>
        </div>
        {canPublish ? (
          <button
            type="button"
            disabled={drafts.length === 0 || publishMutation.isPending}
            onClick={() => {
              setMessage(null);
              setConfirmOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
            {selected.length > 0
              ? `선택 ${selected.length}건 전체일정으로 보내기`
              : "전체일정으로 보내기"}
          </button>
        ) : (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 max-w-xs">
            전체일정 제출 권한이 없습니다. 부서의 「전체일정으로 보내기」
            담당자에게 요청하세요.
          </p>
        )}
      </div>

      <div className="p-4">
        {message && (
          <p className="text-sm mb-3 text-[#003366] bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            {message}
          </p>
        )}

        {isLoading ? (
          <p className="text-sm text-slate-400 py-8 text-center">불러오는 중...</p>
        ) : drafts.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">
            아직 부서 초안 일정이 없습니다. 위 폼에서 일정을 추가하세요.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3 text-xs text-slate-600">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                />
                전체 선택 ({drafts.length}건)
              </label>
              {isAdmin && (
                <span className="text-slate-400">관리자: {department} 초안</span>
              )}
            </div>

            <div className="space-y-4">
              {grouped.map(([owner, items]) => (
                <div
                  key={owner}
                  className="rounded-lg border border-slate-200 overflow-hidden"
                >
                  <div className="bg-slate-50 px-3 py-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <UserRound className="w-4 h-4 text-slate-500" />
                    {owner}
                    <span className="text-xs font-normal text-slate-500">
                      {items.length}건
                    </span>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {items.map((ev) => (
                      <li
                        key={ev.id}
                        className="px-3 py-2.5 flex items-start gap-3 hover:bg-slate-50/80"
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selected.includes(ev.id)}
                          onChange={() => toggleOne(ev.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded ${CATEGORY_COLORS[ev.category]}`}
                            >
                              {CATEGORY_LABEL[ev.category]}
                            </span>
                            <span className="text-xs text-slate-500">
                              {formatPeriod(ev.startDate, ev.endDate)}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {ev.title}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {ev.location || "-"}
                          </p>
                        </div>
                        <button
                          type="button"
                          title="수정"
                          onClick={() => setEditing(ev)}
                          className="p-1.5 rounded border border-[#003366]/30 text-[#003366] hover:bg-blue-50"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="초안 삭제"
                          onClick={() => {
                            if (confirm("이 초안을 삭제할까요?")) {
                              deleteMutation.mutate(ev.id);
                            }
                          }}
                          className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-5"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h4 className="text-lg font-bold text-[#003366]">
                전체일정으로 보내기
              </h4>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="p-1 rounded hover:bg-slate-100 text-slate-500"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              소속 팀 일정을 취합한 뒤, 아래{" "}
              <strong className="text-[#003366]">「전체로 보내기」</strong>를
              눌러야 전체 일정으로 반영됩니다.
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {department} 초안 {pendingIds.length}건이 제출 대상입니다.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={publishMutation.isPending || pendingIds.length === 0}
                onClick={() => publishMutation.mutate(pendingIds)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
                {publishMutation.isPending ? "제출 중..." : "전체로 보내기"}
              </button>
            </div>
          </div>
        </div>
      )}

      <EventEditDialog
        event={editing}
        isAdmin={isAdmin}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
