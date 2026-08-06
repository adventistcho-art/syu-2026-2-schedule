"use client";

import { X } from "lucide-react";
import type { ScheduleEvent } from "@/lib/schedule/types";
import { formatPeriod } from "@/lib/schedule/types";
import {
  categoryColorClass,
  categoryLabel,
  displayAuthor,
  displayDept,
} from "@/lib/schedule/display";

type Props = {
  dateKey: string | null;
  events: ScheduleEvent[];
  onClose: () => void;
  onSelectEvent: (event: ScheduleEvent) => void;
};

function formatDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  return `${y}년 ${m}월 ${d}일`;
}

export default function DayEventsModal({
  dateKey,
  events,
  onClose,
  onSelectEvent,
}: Props) {
  if (!dateKey) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col z-10">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-[#003366]">
              {formatDateLabel(dateKey)} 일정
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              총 {events.length}건 · 항목을 클릭하면 상세를 볼 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-3 space-y-2">
          {events.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">
              등록된 일정이 없습니다.
            </p>
          ) : (
            events.map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => {
                  onSelectEvent(ev);
                  onClose();
                }}
                className="w-full text-left rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${categoryColorClass(ev.category)}`}
                  >
                    {categoryLabel(ev.category)}
                  </span>
                  {displayDept(ev) !== "-" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                      {displayDept(ev)}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-800">{ev.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatPeriod(ev.startDate, ev.endDate)}
                  {displayAuthor(ev) !== "-" ? ` · ${displayAuthor(ev)}` : ""}
                  {ev.location ? ` · ${ev.location}` : ""}
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
