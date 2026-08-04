"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ChevronDown,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Minus,
} from "lucide-react";
import { REAL_INDEXES } from "@/lib/realData";
import type { ComponentIndicator, SubIndicator } from "@/lib/mockData";
import {
  cn,
  achieveStatusLabel,
  round,
  calcDynamicComp,
  formatNumber,
} from "@/lib/utils";
import ChartModal from "@/components/performance/ChartModal";
import { usePerformanceStore } from "@/lib/store";

// ── 동적 계산 타입 ─────────────────────────────────────────────
interface DynamicComp extends ComponentIndicator {
  dynamicActual: number | null;
  dynamicAchieveRate: number | null;
}

interface DynamicIndex {
  id: string;
  name: string;
  category: string;
  description: string;
  formula: string;
  targetScore: number;
  dynamicScore: number | null;
  /** true면 일부 구성지표만 데이터 있음 */
  isPartial: boolean;
  components: DynamicComp[];
  trendData: { year: number; target: number; actual: number | null }[];
}

// ══════════════════════════════════════════════════════════════
// 페이지
// ══════════════════════════════════════════════════════════════
export default function PublicDashboardPage() {
  const { sessions, hydrateFromDB, loadSessionsFromDB, liveIndexes } = usePerformanceStore();
  const indexes = liveIndexes ?? REAL_INDEXES;

  const availableYears = Object.keys(sessions)
    .map(Number)
    .sort((a, b) => b - a);
  const [selectedYear, setSelectedYear] = useState(availableYears[0] ?? 2024);

  // DB에서 전체 세션·실적 로드 (새로고침 후에도 연도 탭 유지)
  useEffect(() => {
    loadSessionsFromDB();
  }, [loadSessionsFromDB]);

  useEffect(() => {
    hydrateFromDB(selectedYear);
  }, [selectedYear, hydrateFromDB]);

  // 세션 목록이 로드되면 선택 연도 보정
  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const session = sessions[selectedYear];
  const submissions = session?.submissions ?? {};

  /* 동적 데이터 계산 */
  const dynamicIndexes = useMemo<DynamicIndex[]>(() => {
    return indexes
      .filter((idx) => {
        // 세션의 동적 공개 설정 우선, 없으면 정적 isPublic
        const isPublicInSession = session?.indexPublic[idx.id] ?? idx.isPublic;
        // 세션이 있으면 APPROVED된 지표만, 없으면 isPublic 기준
        const isApproved = !session || session.indexApprovals[idx.id] === "APPROVED";
        return isPublicInSession && isApproved;
      })
      .map((idx) => {
      const compResults: DynamicComp[] = idx.components.map((comp) => {
        const { dynamicActual, dynamicAchieveRate } = calcDynamicComp(
          comp,
          submissions
        );
        return { ...comp, dynamicActual, dynamicAchieveRate };
      });

      let dynamicScore: number | null = 0;
      let hasNull = false;
      let hasData = false;

      for (const comp of compResults) {
        if (comp.dynamicAchieveRate === null) {
          hasNull = true;
        } else {
          hasData = true;
          dynamicScore! +=
            Math.min(comp.dynamicAchieveRate, 100) * (comp.weight / 100);
        }
      }

      if (hasNull && !hasData) dynamicScore = null;
      else if (hasNull && hasData) dynamicScore = dynamicScore; // partial

      return {
        id: idx.id,
        name: idx.name,
        category: idx.category,
        description: idx.description,
        formula: idx.formula,
        targetScore: idx.targetScore,
        dynamicScore: hasNull && !hasData ? null : dynamicScore,
        isPartial: hasNull && hasData,
        components: compResults,
        trendData: idx.trendData,
      };
    });
  }, [submissions, session]);

  return (
    <div className="p-8 animate-fade-in">
      {/* 헤더 */}
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-extrabold text-white mb-3">
          대학 발전계획 성과를 투명하게 공유합니다
        </h1>
        <p className="text-slate-400 text-sm leading-relaxed">
          각 지수 카드를 클릭하여 세부 구성지표의 산식과 실적·목표를 확인하세요.
          <br />
          <span className="text-xs text-slate-500">
            담당자가 실적을 입력하면 실시간으로 반영됩니다.
          </span>
        </p>
      </div>

      {/* 연도 탭 */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center gap-2">
        <span className="text-xs text-slate-500 font-semibold mr-1">
          학년도 선택:
        </span>
        {availableYears.map((year) => {
          const s = sessions[year];
          return (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-bold transition",
                selectedYear === year
                  ? "bg-purple-700 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              )}
            >
              {year}
              {s?.status === "APPROVED" && (
                <span className="ml-1 text-xs text-green-400">✓</span>
              )}
              {s?.status === "OPEN" && (
                <span className="ml-1 text-xs text-yellow-400">●</span>
              )}
            </button>
          );
        })}
        <span className="text-xs text-slate-600 ml-auto">
          {session?.status === "APPROVED"
            ? "✓ 공시 완료"
            : session?.status === "OPEN"
            ? "● 입력 진행중"
            : session?.status === "CLOSED"
            ? "◼ 마감됨"
            : ""}
        </span>
      </div>

      {/* 지수 카드 목록 */}
      <div className="max-w-4xl mx-auto space-y-6">
        {dynamicIndexes.map((idx) => (
          <IndexCard
            key={idx.id}
            index={idx}
            year={selectedYear}
            submissions={submissions}
          />
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 종합지수 카드
// ══════════════════════════════════════════════════════════════
function IndexCard({
  index,
  year,
  submissions,
}: {
  index: DynamicIndex;
  year: number;
  submissions: Record<string, { actualValue: number | null }>;
}) {
  const [open, setOpen] = useState(false);
  const [chartModal, setChartModal] = useState<{
    type: "index" | "component";
    id: string;
    name: string;
  } | null>(null);

  const score = index.dynamicScore;
  const pct = score != null ? Math.min(round((score / 100) * 100, 1), 100) : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-purple-800 transition-colors">
      <div className="flex relative">
        <div
          className={cn(
            "w-1 flex-shrink-0",
            score == null
              ? "bg-slate-700"
              : index.isPartial
              ? "bg-yellow-500"
              : "bg-purple-500"
          )}
        />

        <div className="flex-1 p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center">
          {/* 왼쪽: 정보 */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-purple-900/50 text-purple-300 text-xs font-bold px-2 py-0.5 rounded border border-purple-800">
                ID: {index.id}
              </span>
              <span className="text-slate-500 text-xs">{index.category}</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">{index.name}</h2>
            <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">
              {index.description}
            </p>
            <div className="mt-3 flex flex-wrap gap-1 items-center">
              <span className="text-xs text-slate-500 mr-1">산출식:</span>
              {index.formula.split(/(?=[+×])/).map((part, i) => (
                <span
                  key={i}
                  className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded font-mono"
                >
                  {part.trim()}
                </span>
              ))}
            </div>
          </div>

          {/* 오른쪽: 점수 */}
          <div className="w-full md:w-56 flex flex-col items-end gap-3">
            <div className="text-right">
              <p className="text-xs text-slate-500 font-semibold mb-1">
                {year}학년도 성과관리종합지수
              </p>
              {score == null ? (
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-600">—</span>
                  <span className="text-slate-600 text-sm">미집계</span>
                </div>
              ) : (
                <div className="flex items-baseline gap-1">
                  <span
                    className={cn(
                      "text-5xl font-black",
                      index.isPartial ? "text-yellow-300" : "text-white"
                    )}
                  >
                    {score.toFixed(1)}
                  </span>
                  <span className="text-slate-400 text-lg">/ 100</span>
                  {index.isPartial && (
                    <span className="text-xs text-yellow-500 ml-1">부분집계</span>
                  )}
                </div>
              )}
            </div>

            {/* 진행률 바 */}
            <div className="w-full">
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    score == null
                      ? "bg-slate-700"
                      : index.isPartial
                      ? "bg-yellow-500"
                      : "bg-purple-500"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={() =>
                  setChartModal({ type: "index", id: index.id, name: index.name })
                }
                className="w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg bg-purple-900/40 border border-purple-800 text-purple-300 hover:bg-purple-800/40 transition"
              >
                <TrendingUp className="w-4 h-4" />
                연차별 종합 흐름 조회
              </button>
              <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition"
              >
                구성지표 ({index.components.length}개) 상세
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-slate-400 transition-transform duration-300",
                    open && "rotate-180"
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 구성지표 아코디언 */}
      <div
        className={cn(
          "accordion-body border-t border-slate-800",
          open ? "max-h-[4000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {open && (
          <div className="bg-slate-950/50 p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {index.components.map((comp) => (
              <ComponentCard
                key={comp.id}
                comp={comp}
                submissions={submissions}
                onChartClick={() =>
                  setChartModal({
                    type: "component",
                    id: comp.id,
                    name: comp.name,
                  })
                }
              />
            ))}
          </div>
        )}
      </div>

      {chartModal && (
        <ChartModal
          type={chartModal.type}
          targetId={chartModal.id}
          title={chartModal.name}
          onClose={() => setChartModal(null)}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 구성지표 카드
// ══════════════════════════════════════════════════════════════
function ComponentCard({
  comp,
  submissions,
  onChartClick,
}: {
  comp: DynamicComp;
  submissions: Record<string, { actualValue: number | null }>;
  onChartClick: () => void;
}) {
  const [subOpen, setSubOpen] = useState(false);

  const achieveRate = comp.dynamicAchieveRate;
  const status =
    achieveRate != null ? achieveStatusLabel(achieveRate) : null;

  const submittedCount = comp.subIndicators.filter(
    (s) => submissions[s.id]?.actualValue !== null && submissions[s.id]?.actualValue !== undefined
  ).length;
  const totalCount = comp.subIndicators.length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* 구성지표 헤더 */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="font-bold text-white text-base leading-tight flex-1">
            {comp.name}
          </h4>
          {totalCount > 0 && (
            <span
              className={cn(
                "flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full",
                submittedCount === totalCount
                  ? "bg-green-900/40 text-green-400"
                  : submittedCount > 0
                  ? "bg-yellow-900/40 text-yellow-400"
                  : "bg-slate-800 text-slate-500"
              )}
            >
              {submittedCount}/{totalCount}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mb-3">
          가중치 {comp.weight}% · 산식:{" "}
          <span className="font-mono text-slate-400">{comp.formula}</span>
        </p>

        {/* 실적/목표/달성률 */}
        <div className="flex items-end justify-between border-t border-slate-800 pt-3">
          <div className="flex gap-6">
            {/* 달성률 */}
            <div>
              <p className="text-xs text-slate-500 font-semibold mb-0.5">달성률</p>
              {achieveRate != null ? (
                <>
                  <p className={cn("text-2xl font-black", status!.color)}>
                    {round(achieveRate, 1)}%
                  </p>
                  <span className="text-xs font-semibold text-slate-500">
                    {status!.label}
                  </span>
                </>
              ) : (
                <p className="text-2xl font-black text-slate-600">—</p>
              )}
            </div>

            {/* 실적 vs 목표 */}
            <div>
              <p className="text-xs text-slate-500 font-semibold mb-0.5">실적 / 목표</p>
              {comp.dynamicActual != null ? (
                <p className="text-sm font-bold text-white">
                  {formatNumber(round(comp.dynamicActual, 2))}{" "}
                  <span className="text-slate-500 font-normal">
                    / {formatNumber(comp.targetValue)} {comp.unit}
                  </span>
                </p>
              ) : (
                <p className="text-sm text-slate-600">미입력</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 items-end">
            <button
              onClick={onChartClick}
              className="flex items-center gap-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition"
            >
              <BarChart3 className="w-3 h-3 text-slate-400" />
              그래프
            </button>
            {totalCount > 0 && (
              <button
                onClick={() => setSubOpen((v) => !v)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition"
              >
                하위지표
                <ChevronDown
                  className={cn(
                    "w-3 h-3 transition-transform",
                    subOpen && "rotate-180"
                  )}
                />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 하위지표 목록 */}
      {subOpen && totalCount > 0 && (
        <div className="border-t border-slate-800 divide-y divide-slate-800/60">
          {comp.subIndicators.map((sub) => (
            <SubRow key={sub.id} sub={sub} submissions={submissions} />
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 하위지표 행
// ══════════════════════════════════════════════════════════════
function SubRow({
  sub,
  submissions,
}: {
  sub: SubIndicator;
  submissions: Record<string, { actualValue: number | null }>;
}) {
  const submitted = submissions[sub.id];
  const actual = submitted?.actualValue ?? null;
  const hasValue = actual !== null;

  return (
    <div className="px-5 py-3 flex items-start gap-3">
      {/* 변수 키 배지 */}
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-slate-400 mt-0.5">
        {sub.variableKey}
      </span>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-xs font-semibold text-slate-300">{sub.name}</p>
          {sub.inputType === "MASTER_AUTO" && (
            <span className="text-xs bg-blue-900/30 text-blue-400 border border-blue-800/50 px-1 py-0.5 rounded leading-none">
              자동
            </span>
          )}
        </div>
        {sub.description && (
          <p className="text-xs text-slate-600 mt-0.5 leading-snug">
            {sub.description}
          </p>
        )}
      </div>

      {/* 실적 / 목표 */}
      <div className="flex-shrink-0 text-right">
        {hasValue ? (
          <>
            <p className="text-xs font-bold text-white">
              {formatNumber(actual!)} {sub.unit}
            </p>
            <p className="text-xs text-slate-600">
              목표 {formatNumber(sub.targetValue)} {sub.unit}
            </p>
          </>
        ) : (
          <p className="text-xs text-slate-600">미입력</p>
        )}
      </div>

      {/* 제출 상태 아이콘 */}
      <div className="flex-shrink-0 mt-0.5">
        {hasValue ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : (
          <Minus className="w-4 h-4 text-slate-700" />
        )}
      </div>
    </div>
  );
}
