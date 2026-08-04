"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ScheduleEvent } from "@/lib/schedule/types";
import { isDateInRange, toDateKey } from "@/lib/schedule/types";
import {
  CATEGORY_COLORS,
  CATEGORY_LABEL,
  type EventCategory,
} from "@/lib/schedule/constants";
import { categoryColorClass, categoryLabel } from "@/lib/schedule/display";

type Props = {
  events: ScheduleEvent[];
  onSelectEvent: (event: ScheduleEvent) => void;
};

const MIN_MONTH = new Date(2026, 8, 1);
const MAX_MONTH = new Date(2027, 1, 1);

export default function SemesterCalendar({ events, onSelectEvent }: Props) {
  const [current, setCurrent] = useState(MIN_MONTH);
  const [category, setCategory] = useState<"ALL" | EventCategory>("ALL");

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(current), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(current), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [current]);

  const monthEvents = useMemo(() => {
    const prefix = format(current, "yyyy-MM");
    return events
      .filter((e) => {
        const s = toDateKey(e.startDate);
        const en = toDateKey(e.endDate);
        return s.startsWith(prefix) || en.startsWith(prefix) || (s < `${prefix}-01` && en > `${prefix}-28`);
      })
      .sort((a, b) => toDateKey(a.startDate).localeCompare(toDateKey(b.startDate)));
  }, [events, current]);

  const changeMonth = (delta: number) => {
    const next = addMonths(current, delta);
    if (next < MIN_MONTH || next > MAX_MONTH) return;
    setCurrent(next);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-9 bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              disabled={current <= MIN_MONTH}
              className="p-1.5 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-bold text-[#003366] min-w-[140px] text-center">
              {format(current, "yyyy년 M월", { locale: ko })}
            </h3>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              disabled={current >= MAX_MONTH}
              className="p-1.5 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as "ALL" | EventCategory)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5"
          >
            <option value="ALL">전체 구분 보기</option>
            {(Object.keys(CATEGORY_LABEL) as EventCategory[]).map((k) => (
              <option key={k} value={k}>
                {CATEGORY_LABEL[k]}
              </option>
            ))}
          </select>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-7 text-center text-xs font-bold bg-slate-100 rounded-lg py-2 mb-2">
            {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
              <div
                key={d}
                className={i === 0 ? "text-red-500" : i === 6 ? "text-blue-600" : "text-slate-600"}
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const inMonth = isSameMonth(day, current);
              const dow = day.getDay();
              const holidays = events.filter(
                (e) =>
                  e.category === "HOLIDAY" &&
                  isDateInRange(key, e.startDate, e.endDate)
              );
              const dayEvents = events.filter((e) => {
                if (e.category === "HOLIDAY") return false;
                if (category !== "ALL" && e.category !== category) return false;
                return isDateInRange(key, e.startDate, e.endDate);
              });

              return (
                <div
                  key={key}
                  className={`min-h-[100px] rounded-lg border p-1.5 ${
                    !inMonth
                      ? "bg-slate-50 opacity-40 border-slate-100"
                      : holidays.length
                        ? "bg-red-50 border-red-100"
                        : "bg-slate-50/60 border-slate-100"
                  }`}
                >
                  <div
                    className={`text-xs font-bold mb-1 flex items-center gap-1 ${
                      holidays.length || dow === 0
                        ? "text-red-500"
                        : dow === 6
                          ? "text-blue-600"
                          : "text-slate-700"
                    }`}
                  >
                    <span>{format(day, "d")}</span>
                    {holidays[0] && (
                      <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded shrink-0">
                        공휴일
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {(category === "ALL" || category === "HOLIDAY"
                      ? holidays
                      : []
                    )
                      .slice(0, category === "HOLIDAY" ? 3 : 1)
                      .map((ev) => (
                        <button
                          key={`h-${ev.id}-${key}`}
                          type="button"
                          title={`[공휴일] ${ev.title}`}
                          onClick={() => onSelectEvent(ev)}
                          className={`block w-full text-left text-[10px] px-1 py-0.5 rounded truncate ${CATEGORY_COLORS.HOLIDAY}`}
                        >
                          {ev.title}
                        </button>
                      ))}
                    {dayEvents.slice(0, 3).map((ev) => (
                      <button
                        key={`${ev.id}-${key}`}
                        type="button"
                        title={`[${categoryLabel(ev.category)}] ${ev.title}`}
                        onClick={() => onSelectEvent(ev)}
                        className={`block w-full text-left text-[10px] px-1 py-0.5 rounded truncate ${CATEGORY_COLORS[ev.category]}`}
                      >
                        {ev.title}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <p className="text-[10px] text-slate-500 px-1">
                        +{dayEvents.length - 3}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 justify-center mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
            {(Object.keys(CATEGORY_LABEL) as EventCategory[]).map((k) => (
              <span key={k} className="inline-flex items-center gap-1">
                <span className={`w-2.5 h-2.5 rounded-sm ${CATEGORY_COLORS[k]}`} />
                {CATEGORY_LABEL[k]}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-3 space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="px-4 py-3 border-b border-slate-100 font-bold text-sm">
            이달의 주요 일정
          </div>
          <div className="p-2 max-h-[420px] overflow-y-auto space-y-2">
            {monthEvents.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-6">
                등록된 일정이 없습니다.
              </p>
            ) : (
              monthEvents.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => onSelectEvent(ev)}
                  className="w-full text-left p-2 rounded-lg bg-slate-50 border-l-4 border-[#003366] hover:bg-slate-100"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${categoryColorClass(ev.category)}`}
                    >
                      {categoryLabel(ev.category)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      {toDateKey(ev.startDate).slice(5)}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{ev.title}</p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 text-xs text-slate-500 space-y-2">
          <p className="font-bold text-slate-700">부서별 입력 안내</p>
          <p>입력된 일정은 실시간 통합 캘린더에 반영됩니다.</p>
          <p>본인 주부서 일정만 등록·삭제할 수 있습니다.</p>
        </div>
      </div>
    </div>
  );
}
