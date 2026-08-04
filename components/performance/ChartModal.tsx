"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { REAL_INDEXES } from "@/lib/realData";
import { usePerformanceStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface ChartModalProps {
  type: "index" | "component";
  targetId: string;
  title: string;
  onClose: () => void;
}

export default function ChartModal({
  type,
  targetId,
  title,
  onClose,
}: ChartModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const liveIndexes = usePerformanceStore((s) => s.liveIndexes);
  const indexes = liveIndexes ?? REAL_INDEXES;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // 데이터 찾기
  let trendData: { year: number; target: number; actual: number | null }[] = [];
  let unit = "점";

  if (type === "index") {
    const idx = indexes.find((i) => i.id === targetId);
    trendData = idx?.trendData ?? [];
    unit = "점";
  } else {
    for (const idx of indexes) {
      const comp = idx.components.find((c) => c.id === targetId);
      if (comp) {
        trendData = comp.trendData;
        unit = comp.unit;
        break;
      }
    }
  }

  const years = trendData.map((d) => d.year);
  const maxVal = Math.max(...trendData.map((d) => Math.max(d.target, d.actual ?? 0))) * 1.15;
  const chartH = 200;

  function yPos(val: number) {
    return chartH - (val / maxVal) * chartH;
  }

  // SVG 꺾은선
  const targetPoints = trendData
    .map((d, i) => {
      const x = (i / (trendData.length - 1)) * 560;
      const y = yPos(d.target);
      return `${x},${y}`;
    })
    .join(" ");

  const actualPoints = trendData
    .filter((d) => d.actual !== null)
    .map((d, i) => {
      const idx = trendData.findIndex((t) => t.year === d.year);
      const x = (idx / (trendData.length - 1)) * 560;
      const y = yPos(d.actual!);
      return `${x},${y}`;
    })
    .join(" ");

  const areaPath =
    trendData
      .filter((d) => d.actual !== null)
      .map((d, i) => {
        const idx = trendData.findIndex((t) => t.year === d.year);
        const x = (idx / (trendData.length - 1)) * 560;
        const y = yPos(d.actual!);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ") +
    (() => {
      const lastActualIdx = trendData
        .map((d) => d.actual)
        .lastIndexOf(
          trendData
            .filter((d) => d.actual !== null)
            .at(-1)?.actual ?? null
        );
      if (lastActualIdx < 0) return "";
      const x = (lastActualIdx / (trendData.length - 1)) * 560;
      return ` L ${x} ${chartH} L 0 ${chartH} Z`;
    })();

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <p className="text-xs text-slate-500 font-semibold mb-0.5">
              {type === "index" ? "종합지수 연차별 흐름" : "구성지표 연차별 흐름"}
            </p>
            <h3 className="text-white font-bold text-lg">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-6 px-6 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 border-t-2 border-dashed border-slate-500" />
            <span className="text-xs text-slate-400">목표치</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 border-t-2 border-purple-400" />
            <span className="text-xs text-slate-400">실적치</span>
          </div>
        </div>

        {/* SVG 차트 */}
        <div className="px-6 pb-4 overflow-x-auto">
          <svg
            viewBox={`0 0 580 ${chartH + 30}`}
            className="w-full"
            style={{ minWidth: 400 }}
          >
            {/* 영역 채색 */}
            {areaPath && (
              <path
                d={areaPath}
                fill="rgba(139,92,246,0.15)"
              />
            )}
            {/* 목표 점선 */}
            {trendData.length > 1 && (
              <polyline
                points={targetPoints}
                fill="none"
                stroke="#64748b"
                strokeWidth="2"
                strokeDasharray="6 4"
              />
            )}
            {/* 실적 실선 */}
            {actualPoints && (
              <polyline
                points={actualPoints}
                fill="none"
                stroke="#a78bfa"
                strokeWidth="2.5"
              />
            )}
            {/* 데이터 포인트 & 연도 라벨 */}
            {trendData.map((d, i) => {
              const x = (i / (trendData.length - 1)) * 560;
              return (
                <g key={d.year}>
                  {/* 목표 점 */}
                  <circle
                    cx={x}
                    cy={yPos(d.target)}
                    r="3"
                    fill="#64748b"
                  />
                  {/* 실적 점 */}
                  {d.actual !== null && (
                    <circle
                      cx={x}
                      cy={yPos(d.actual)}
                      r="4"
                      fill="#a78bfa"
                    />
                  )}
                  {/* 연도 */}
                  <text
                    x={x}
                    y={chartH + 20}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#64748b"
                  >
                    {d.year}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* 데이터 테이블 (웹 접근성) */}
        <div className="px-6 pb-6">
          <p className="text-xs text-slate-500 font-semibold mb-2">데이터 테이블</p>
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-3 py-2 text-slate-400 font-semibold">연도</th>
                  {trendData.map((d) => (
                    <th
                      key={d.year}
                      className={cn(
                        "text-center px-3 py-2 font-semibold",
                        d.year === 2025
                          ? "text-purple-400"
                          : "text-slate-400"
                      )}
                    >
                      {d.year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-800/50">
                  <td className="px-3 py-2 text-slate-500">목표 ({unit})</td>
                  {trendData.map((d) => (
                    <td key={d.year} className="text-center px-3 py-2 text-slate-400">
                      {d.target}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-3 py-2 text-slate-500">실적 ({unit})</td>
                  {trendData.map((d) => (
                    <td
                      key={d.year}
                      className={cn(
                        "text-center px-3 py-2 font-semibold",
                        d.actual !== null ? "text-purple-300" : "text-slate-700"
                      )}
                    >
                      {d.actual !== null ? d.actual : "—"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
