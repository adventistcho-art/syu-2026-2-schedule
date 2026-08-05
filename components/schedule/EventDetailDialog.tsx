"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Calendar, MapPin, FileText, Pencil, Trash2 } from "lucide-react";
import type { ScheduleEvent } from "@/lib/schedule/types";
import { formatPeriod } from "@/lib/schedule/types";
import {
  categoryColorClass,
  categoryLabel,
  displayAuthor,
  displayDept,
} from "@/lib/schedule/display";
import { canManageEvent } from "@/lib/schedule/permissions";

type Props = {
  event: ScheduleEvent | null;
  department: string;
  isAdmin: boolean;
  onClose: () => void;
  onEdit?: (event: ScheduleEvent) => void;
};

export default function EventDetailDialog({
  event,
  department,
  isAdmin,
  onClose,
  onEdit,
}: Props) {
  const queryClient = useQueryClient();

  const delMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "삭제 실패");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      onClose();
    },
  });

  if (!event) return null;

  const canManage = canManageEvent(event, department, isAdmin);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 z-10">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h3 className="text-lg font-bold text-slate-900">{event.title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <span
            className={`text-xs px-2 py-1 rounded ${categoryColorClass(event.category)}`}
          >
            {categoryLabel(event.category)}
          </span>
          {displayDept(event) !== "-" && (
            <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">
              {displayDept(event)}
            </span>
          )}
        </div>

        <div className="space-y-3 text-sm text-slate-700">
          <p className="flex items-start gap-2">
            <Calendar className="w-4 h-4 mt-0.5 text-slate-400" />
            <span>
              {formatPeriod(event.startDate, event.endDate)} (
              {event.startDate.slice(0, 10)} ~ {event.endDate.slice(0, 10)})
            </span>
          </p>
          <p className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 text-slate-400" />
            <span>{event.location || "-"}</span>
          </p>
          {displayAuthor(event) !== "-" && (
            <p className="text-xs text-slate-500">작성: {displayAuthor(event)}</p>
          )}
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="flex items-center gap-2 font-semibold mb-1">
              <FileText className="w-4 h-4 text-slate-400" />
              상세 내용
            </p>
            <p className="text-slate-600 whitespace-pre-wrap">
              {event.description || "상세 정보가 없습니다."}
            </p>
          </div>
        </div>

        {delMutation.isError && (
          <p className="text-sm text-red-600 mt-3">
            {(delMutation.error as Error).message}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {canManage && (
            <>
              <button
                type="button"
                onClick={() => onEdit?.(event)}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-[#003366]/30 text-[#003366] hover:bg-blue-50"
              >
                <Pencil className="w-3.5 h-3.5" />
                수정
              </button>
              <button
                type="button"
                disabled={delMutation.isPending}
                onClick={() => {
                  if (confirm("해당 일정을 삭제하시겠습니까?")) {
                    delMutation.mutate(event.id);
                  }
                }}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                삭제
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
