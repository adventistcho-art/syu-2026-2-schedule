"use client";

import { CalendarCheck, BookOpen, HeartPulse, Users } from "lucide-react";
import type { ScheduleEvent } from "@/lib/schedule/types";

export default function StatCards({ events }: { events: ScheduleEvent[] }) {
  const total = events.length;
  const academic = events.filter((e) => e.category === "ACADEMIC").length;
  const chapel = events.filter((e) => e.category === "CHAPEL").length;
  const student = events.filter(
    (e) => e.category === "STUDENT" || e.category === "DEPT"
  ).length;

  const cards = [
    {
      label: "총 등록 일정",
      value: total,
      icon: CalendarCheck,
      border: "border-l-[#003366]",
      iconClass: "text-[#003366]",
    },
    {
      label: "공식 학사일정",
      value: academic,
      icon: BookOpen,
      border: "border-l-[#003366]",
      iconClass: "text-sky-600",
    },
    {
      label: "교목/영성 행사",
      value: chapel,
      icon: HeartPulse,
      border: "border-l-[#2b8a3e]",
      iconClass: "text-green-600",
    },
    {
      label: "학생/부서 행사",
      value: student,
      icon: Users,
      border: "border-l-[#e8590c]",
      iconClass: "text-orange-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`bg-white rounded-xl shadow-sm border border-slate-100 border-l-4 ${c.border} p-4`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">{c.label}</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{c.value}</p>
            </div>
            <c.icon className={`w-8 h-8 opacity-80 ${c.iconClass}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
