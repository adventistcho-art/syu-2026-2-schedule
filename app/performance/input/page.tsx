"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Lock, CheckCircle2, Save, Send, Building2, ChevronDown,
  ChevronRight, AlertCircle, ClipboardList, Calendar, AlertTriangle, Pencil, Database,
} from "lucide-react";
import { REAL_INDEXES } from "@/lib/realData";
import { cn, formatNumber } from "@/lib/utils";
import { usePerformanceStore } from "@/lib/store";
import type { CompositeIndex, SubIndicator } from "@/lib/mockData";

// ── 그룹핑 타입 ───────────────────────────────────────────────
interface GroupedItem {
  indexId: string;
  indexName: string;
  indexCategory: string;
  compId: string;
  compName: string;
  compWeight: number;
  compFormula: string;
  sub: SubIndicator;
}

function getAllDeptNames(indexes: CompositeIndex[]): string[] {
  const set = new Set<string>();
  indexes.forEach((idx) =>
    idx.components.forEach((comp) =>
      comp.subIndicators.forEach((sub) => set.add(sub.deptName))
    )
  );
  return Array.from(set).sort();
}

function getMyItems(deptName: string, indexes: CompositeIndex[]): GroupedItem[] {
  const items: GroupedItem[] = [];
  indexes.forEach((idx) =>
    idx.components.forEach((comp) =>
      comp.subIndicators
        .filter((s) => s.deptName === deptName)
        .forEach((sub) =>
          items.push({
            indexId: idx.id,
            indexName: idx.name,
            indexCategory: idx.category,
            compId: comp.id,
            compName: comp.name,
            compWeight: comp.weight,
            compFormula: comp.formula,
            sub,
          })
        )
    )
  );
  return items;
}

function groupItems(items: GroupedItem[]) {
  const map = new Map<
    string,
    {
      indexName: string;
      indexCategory: string;
      comps: Map<string, { compName: string; compWeight: number; compFormula: string; items: GroupedItem[] }>;
    }
  >();
  items.forEach((item) => {
    if (!map.has(item.indexId))
      map.set(item.indexId, { indexName: item.indexName, indexCategory: item.indexCategory, comps: new Map() });
    const ig = map.get(item.indexId)!;
    if (!ig.comps.has(item.compId))
      ig.comps.set(item.compId, { compName: item.compName, compWeight: item.compWeight, compFormula: item.compFormula, items: [] });
    ig.comps.get(item.compId)!.items.push(item);
  });
  return map;
}

// ═══════════════════════════════════════════════════════════════
export default function InputPage() {
  const {
    sessions, activeYear, setActiveYear,
    isInputAllowed, saveValue, submitSub, submitMany,
    hydrateFromDB, loadSessionsFromDB, liveIndexes,
  } = usePerformanceStore();

  const indexes = liveIndexes ?? REAL_INDEXES;

  const allDepts = useMemo(() => getAllDeptNames(indexes), [indexes]);
  const [currentDept, setCurrentDept] = useState(allDepts[0] ?? "");
  const [deptOpen, setDeptOpen] = useState(false);

  const myItems = useMemo(() => getMyItems(currentDept, indexes), [currentDept, indexes]);
  const grouped = useMemo(() => groupItems(myItems), [myItems]);

  // DB에서 전체 세션·실적 로드 (새로고침 후에도 연도 탭 유지)
  useEffect(() => {
    loadSessionsFromDB();
  }, [loadSessionsFromDB]);

  useEffect(() => {
    hydrateFromDB(activeYear);
  }, [activeYear, hydrateFromDB]);

  const session = sessions[activeYear];
  const submissions = session?.submissions ?? {};
  const inputAllowed = isInputAllowed(activeYear);

  // ── 마스터 코드 로드 & MASTER_AUTO 자동 제출 ─────────────
  useEffect(() => {
    if (!session || session.status !== "OPEN") return;
    fetch(`/api/perf-master-codes?year=${activeYear}`)
      .then((r) => r.json())
      .then(async (codes: { code: string; value: number }[]) => {
        const mcMap: Record<string, number> = {};
        codes.forEach((c) => { mcMap[c.code] = c.value; });
        const autoEntries: { subId: string; value: number | null }[] = [];
        indexes.forEach((idx) =>
          idx.components.forEach((comp) =>
            comp.subIndicators.forEach((sub) => {
              if (sub.inputType === "MASTER_AUTO" && sub.masterCode) {
                const val = mcMap[sub.masterCode];
                if (val !== undefined && session.submissions[sub.id]?.status !== "SUBMITTED") {
                  autoEntries.push({ subId: sub.id, value: val });
                }
              }
            })
          )
        );
        if (autoEntries.length > 0) await submitMany(activeYear, autoEntries);
      })
      .catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeYear, session?.status]);

  // 기한 초과 여부 (OPEN이지만 마감일 지남)
  const deadlineExpired = session?.deadline
    ? new Date() > new Date(session.deadline + "T23:59:59")
    : false;

  // ── 로컬 draft 상태 ───────────────────────────────────────
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  // 제출 완료 후 수정 모드로 전환된 항목 ID 집합
  const [editingIds, setEditingIds] = useState<Set<string>>(new Set());
  const [expandedIndexes, setExpandedIndexes] = useState<Set<string>>(
    () => new Set(myItems.map((i) => i.indexId))
  );

  const sortedYears = Object.keys(sessions).map(Number).sort((a, b) => b - a);

  // ── 부서 변경 ─────────────────────────────────────────────
  const changeDept = (dept: string) => {
    setCurrentDept(dept);
    setDeptOpen(false);
    setDraftValues({});
    setEditingIds(new Set());
    setExpandedIndexes(new Set(getMyItems(dept, indexes).map((i) => i.indexId)));
  };

  const toggleIndex = (indexId: string) => {
    setExpandedIndexes((prev) => {
      const next = new Set(prev);
      next.has(indexId) ? next.delete(indexId) : next.add(indexId);
      return next;
    });
  };

  // ── 저장 / 제출 액션 ──────────────────────────────────────
  const handleSave = () => {
    Object.entries(draftValues).forEach(([subId, val]) => {
      saveValue(activeYear, subId, val === "" ? null : Number(val));
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSubmit = (subId: string) => {
    const val = draftValues[subId] ?? String(submissions[subId]?.actualValue ?? "");
    if (!val) return;
    submitSub(activeYear, subId, Number(val));
    setDraftValues((prev) => { const n = { ...prev }; delete n[subId]; return n; });
    // 수정 모드 해제
    setEditingIds((prev) => { const n = new Set(prev); n.delete(subId); return n; });
  };

  // 수정 모드 진입 (제출 완료된 항목을 다시 편집)
  const enterEdit = (subId: string, currentVal: number | null) => {
    setDraftValues((prev) => ({ ...prev, [subId]: currentVal != null ? String(currentVal) : "" }));
    setEditingIds((prev) => new Set(prev).add(subId));
  };

  // 수정 취소
  const cancelEdit = (subId: string) => {
    setDraftValues((prev) => { const n = { ...prev }; delete n[subId]; return n; });
    setEditingIds((prev) => { const n = new Set(prev); n.delete(subId); return n; });
  };

  const handleSubmitAll = () => {
    const entries = myItems
      .filter((i) => submissions[i.sub.id]?.status !== "SUBMITTED")
      .map((i) => {
        const val = draftValues[i.sub.id] ?? String(submissions[i.sub.id]?.actualValue ?? "");
        return { subId: i.sub.id, value: val ? Number(val) : null };
      })
      .filter((e): e is { subId: string; value: number } => e.value !== null);
    if (entries.length === 0) return;
    submitMany(activeYear, entries);
    setDraftValues({});
  };

  // ── 요약 통계 ─────────────────────────────────────────────
  const totalCount = myItems.length;
  const submittedCount = myItems.filter((i) => submissions[i.sub.id]?.status === "SUBMITTED").length;
  const pendingCount = totalCount - submittedCount;
  const progressPct = totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;
  const canSubmitAll = myItems.some(
    (i) =>
      submissions[i.sub.id]?.status !== "SUBMITTED" &&
      (draftValues[i.sub.id] || submissions[i.sub.id]?.actualValue !== null)
  );

  if (allDepts.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p>입력 가능한 하위지표가 없습니다.</p>
      </div>
    );
  }

  // ── 잠금 상태 메시지 결정 ─────────────────────────────────
  let lockedReason = "";
  if (!session) {
    lockedReason = "아직 이 연도의 수집 세션이 개설되지 않았습니다.";
  } else if (session.status === "APPROVED") {
    lockedReason = "이 연도의 실적은 관리자 승인이 완료되어 잠금 상태입니다.";
  } else if (session.status === "CLOSED") {
    lockedReason = `${activeYear}년 실적 입력이 마감되었습니다.`;
  } else if (deadlineExpired) {
    lockedReason = `입력 기한(${session.deadline})이 지났습니다. 관리자에게 문의하세요.`;
  }

  return (
    <div className="p-6 md:p-8 animate-fade-in max-w-5xl mx-auto">

      {/* ── 헤더 ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">실적 입력</h1>
        <p className="text-slate-400 text-sm">귀 부서가 담당하는 모든 하위지표의 실적을 입력·제출합니다.</p>
      </div>

      {/* ── 연도 선택 ── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {sortedYears.map((year) => {
          const s = sessions[year];
          const dot = s.status === "OPEN" ? "bg-green-400" : s.status === "APPROVED" ? "bg-purple-400" : "bg-slate-500";
          return (
            <button
              key={year}
              onClick={() => { setActiveYear(year); setDraftValues({}); }}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold border transition",
                activeYear === year
                  ? "bg-purple-700 border-purple-500 text-white"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />
              {year}년
            </button>
          );
        })}
        <span className="text-xs text-slate-600">연도를 선택하세요</span>
      </div>

      {/* ── 세션 잠금 배너 ── */}
      {!inputAllowed && lockedReason && (
        <div className="mb-6 p-4 bg-slate-800/80 border border-slate-700 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-yellow-300 text-sm mb-0.5">
              {session?.status === "APPROVED" ? "입력 잠금 (공시 완료)" : "입력 기간 아님"}
            </p>
            <p className="text-sm text-slate-400">{lockedReason}</p>
            {session?.deadline && session.status === "OPEN" && deadlineExpired && (
              <p className="text-xs text-slate-600 mt-1">기한: {session.deadline}</p>
            )}
          </div>
        </div>
      )}

      {/* ── 입력 기한 안내 (OPEN + 기한 있음) ── */}
      {inputAllowed && session?.deadline && (
        <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
          <Calendar className="w-3.5 h-3.5 text-green-500" />
          <span>입력 기한: <strong className="text-green-400">{session.deadline}</strong>까지</span>
        </div>
      )}

      {/* ── 부서 선택 드롭다운 ── */}
      <div className="mb-6 relative inline-block">
        <button
          onClick={() => setDeptOpen((v) => !v)}
          className="inline-flex items-center gap-2 bg-purple-900/40 border border-purple-700 hover:border-purple-500 rounded-xl px-4 py-2 transition"
        >
          <Building2 className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-bold text-purple-200">{currentDept}</span>
          <ChevronDown className={cn("w-4 h-4 text-purple-400 transition-transform", deptOpen && "rotate-180")} />
        </button>
        {deptOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1 min-w-[220px] max-h-72 overflow-y-auto">
            {allDepts.map((d) => (
              <button
                key={d}
                onClick={() => changeDept(d)}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm hover:bg-slate-700 transition",
                  d === currentDept ? "text-purple-300 font-bold" : "text-slate-300"
                )}
              >
                {d}
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-600 mt-1 ml-1">※ 실배포 시 로그인 계정 부서로 자동 설정됩니다</p>
      </div>

      {/* ── 요약 카드 ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 font-semibold mb-1">담당 항목</p>
          <p className="text-3xl font-black text-white">{totalCount}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 font-semibold mb-1">제출 완료</p>
          <p className="text-3xl font-black text-green-400">{submittedCount}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 font-semibold mb-1">미입력</p>
          <p className={cn("text-3xl font-black", pendingCount > 0 ? "text-yellow-400" : "text-slate-600")}>
            {pendingCount}
          </p>
        </div>
      </div>

      {/* 진행률 바 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-slate-500 font-semibold">전체 제출 진행률</span>
          <span className="text-xs font-bold text-purple-300">{progressPct}%</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* ── 상단 일괄 제출 버튼 ── */}
      {inputAllowed && myItems.length > 0 && (
        <div className="flex gap-2 justify-end mb-4">
          <button
            onClick={handleSave}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold border transition",
              saved ? "bg-green-800 border-green-600 text-green-200" : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"
            )}
          >
            <Save className="w-4 h-4" />
            {saved ? "저장됨" : "임시 저장"}
          </button>
          <button
            onClick={handleSubmitAll}
            disabled={!canSubmitAll}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            미입력 전체 제출
          </button>
        </div>
      )}

      {/* ── 담당 항목 없음 ── */}
      {myItems.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 text-slate-700" />
          <p className="text-slate-500 font-semibold">이 부서에 배정된 입력 항목이 없습니다.</p>
        </div>
      )}

      {/* ── 지수별 그룹 ── */}
      <div className="space-y-4">
        {Array.from(grouped.entries()).map(([indexId, indexGroup]) => {
          const isOpen = expandedIndexes.has(indexId);
          const indexItems = Array.from(indexGroup.comps.values()).flatMap((c) => c.items);
          const indexSubmitted = indexItems.filter((i) => submissions[i.sub.id]?.status === "SUBMITTED").length;

          return (
            <div key={indexId} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              {/* 지수 헤더 */}
              <button
                onClick={() => toggleIndex(indexId)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/50 transition"
              >
                <div className="flex items-center gap-3 text-left">
                  <span className="bg-purple-800/60 text-purple-200 text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                    {indexGroup.indexCategory.split(".")[0].trim()}
                  </span>
                  <div>
                    <p className="font-bold text-white text-sm">{indexGroup.indexName}</p>
                    <p className="text-xs text-slate-500">{indexId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-full",
                    indexSubmitted === indexItems.length
                      ? "bg-green-900/50 text-green-400"
                      : "bg-yellow-900/40 text-yellow-400"
                  )}>
                    {indexSubmitted} / {indexItems.length} 제출
                  </span>
                  {isOpen
                    ? <ChevronDown className="w-4 h-4 text-slate-500" />
                    : <ChevronRight className="w-4 h-4 text-slate-500" />}
                </div>
              </button>

              {/* 구성지표별 행 */}
              {isOpen && (
                <div className="border-t border-slate-800">
                  {Array.from(indexGroup.comps.entries()).map(([compId, compGroup]) => (
                    <div key={compId} className="border-b border-slate-800/60 last:border-b-0">
                      {/* 구성지표 소제목 */}
                      <div className="px-5 py-2.5 bg-slate-800/30 flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-bold text-slate-400">[{compId}]</span>
                        <span className="text-xs font-semibold text-slate-300">{compGroup.compName}</span>
                        <span className="text-xs text-slate-600">가중치 {Math.round(compGroup.compWeight)}%</span>
                        <span className="font-mono text-xs text-slate-600">산식: {compGroup.compFormula}</span>
                      </div>

                      {/* 하위지표 행 */}
                      <div className="divide-y divide-slate-800/40">
                        {compGroup.items.map(({ sub }) => {
                          const isSubmitted = submissions[sub.id]?.status === "SUBMITTED";
                          const isEditing = editingIds.has(sub.id);
                          const inputVal = draftValues[sub.id] ?? "";
                          const storedVal = submissions[sub.id]?.actualValue;
                          const displayVal = inputVal || (storedVal != null ? String(storedVal) : "");
                          const hasValue = displayVal !== "";
                          // 실제로 입력 필드를 표시할 조건
                          const showInput = inputAllowed && (!isSubmitted || isEditing);

                          return (
                            <div
                              key={sub.id}
                              className={cn(
                                "flex flex-wrap md:flex-nowrap items-center gap-3 px-5 py-3",
                                !inputAllowed && "opacity-60"
                              )}
                            >
                              {/* 변수 키 */}
                              <span className={cn(
                                "w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-black",
                                isSubmitted ? "bg-green-800/50 text-green-300" : "bg-yellow-600/30 text-yellow-300"
                              )}>
                                {sub.variableKey}
                              </span>

                              {/* 지표명 */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-white truncate">{sub.name}</p>
                                  {sub.inputType === "MASTER_AUTO" && (
                                    <span className="flex-shrink-0 text-xs bg-blue-900/50 text-blue-300 border border-blue-800 px-1.5 py-0.5 rounded font-semibold">
                                      마스터
                                    </span>
                                  )}
                                </div>
                                {sub.description && (
                                  <p className="text-xs text-amber-400/80 mt-0.5 leading-snug">{sub.description}</p>
                                )}
                                <p className="text-xs text-slate-600 mt-0.5">[{sub.id}]</p>
                              </div>

                              {/* 목표값 */}
                              <div className="text-right hidden md:block w-28 flex-shrink-0">
                                <p className="text-xs text-slate-600">목표</p>
                                <p className="text-sm font-semibold text-slate-400">
                                  {formatNumber(sub.targetValue)} {sub.unit}
                                </p>
                              </div>

                              {/* 입력 필드 */}
                              <div className="w-44 flex-shrink-0">
                                {sub.inputType === "MASTER_AUTO" ? (
                                  /* MASTER_AUTO: 읽기 전용 표시 */
                                  <div className="flex items-center justify-end gap-1.5 px-3 py-2 bg-blue-900/20 border border-blue-800/40 rounded-lg text-sm text-blue-300 font-semibold">
                                    <Database className="w-3 h-3 text-blue-400" />
                                    {submissions[sub.id]?.actualValue != null
                                      ? `${formatNumber(submissions[sub.id].actualValue!)} ${sub.unit}`
                                      : "자동 연동 중"}
                                  </div>
                                ) : isSubmitted && !isEditing ? (
                                  <div className="flex items-center justify-end gap-1.5 px-3 py-2 bg-green-900/20 border border-green-800/50 rounded-lg text-sm text-green-300 font-semibold">
                                    <CheckCircle2 className="w-3 h-3" />
                                    {storedVal != null ? `${formatNumber(storedVal)} ${sub.unit}` : "제출완료"}
                                  </div>
                                ) : !inputAllowed ? (
                                  <div className="flex items-center justify-end gap-1.5 px-3 py-2 bg-slate-800/40 border border-slate-700 rounded-lg text-sm text-slate-500">
                                    <Lock className="w-3 h-3" />
                                    {storedVal != null ? `${formatNumber(storedVal)} ${sub.unit}` : "미입력"}
                                  </div>
                                ) : (
                                  <div className="relative">
                                    <input
                                      type="number"
                                      min={0}
                                      value={inputVal}
                                      onChange={(e) =>
                                        setDraftValues((prev) => ({ ...prev, [sub.id]: e.target.value }))
                                      }
                                      placeholder={storedVal != null ? String(storedVal) : "실적 입력"}
                                      className={cn(
                                        "w-full text-white text-sm text-right rounded-lg px-3 py-2 focus:outline-none placeholder-slate-600 pr-10",
                                        isEditing
                                          ? "bg-slate-800 border-2 border-blue-500/70 focus:border-blue-400"
                                          : "bg-slate-800 border-2 border-yellow-600/60 focus:border-yellow-400"
                                      )}
                                    />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">
                                      {sub.unit}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* 제출 / 수정 버튼 */}
                              <div className="w-24 flex-shrink-0">
                                {sub.inputType === "MASTER_AUTO" ? (
                                  <div className="flex items-center justify-center gap-1 text-xs text-blue-500 font-semibold">
                                    <Database className="w-3.5 h-3.5" />
                                    자동
                                  </div>
                                ) : !inputAllowed ? (
                                  <div className="flex items-center justify-center gap-1 text-xs text-slate-600">
                                    <Lock className="w-3.5 h-3.5" />
                                    잠금
                                  </div>
                                ) : isSubmitted && !isEditing ? (
                                  /* 제출완료 상태 → 수정 버튼 */
                                  <button
                                    onClick={() => enterEdit(sub.id, storedVal ?? null)}
                                    className="w-full flex items-center justify-center gap-1 px-2 py-2 bg-slate-700 hover:bg-blue-800/60 border border-slate-600 hover:border-blue-600 text-slate-300 hover:text-blue-300 text-xs font-bold rounded-lg transition"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    수정
                                  </button>
                                ) : isEditing ? (
                                  /* 수정 모드 → 재제출 + 취소 */
                                  <div className="flex flex-col gap-1">
                                    <button
                                      onClick={() => handleSubmit(sub.id)}
                                      disabled={!hasValue}
                                      className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition disabled:opacity-30"
                                    >
                                      <Send className="w-3 h-3" />
                                      재제출
                                    </button>
                                    <button
                                      onClick={() => cancelEdit(sub.id)}
                                      className="w-full flex items-center justify-center text-xs text-slate-500 hover:text-slate-300 transition"
                                    >
                                      취소
                                    </button>
                                  </div>
                                ) : (
                                  /* 미제출 → 제출 버튼 */
                                  <button
                                    onClick={() => handleSubmit(sub.id)}
                                    disabled={!hasValue}
                                    className="w-full flex items-center justify-center gap-1 px-2 py-2 bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    <Send className="w-3 h-3" />
                                    제출
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── 하단 일괄 제출 버튼 ── */}
      {inputAllowed && myItems.length > 0 && (
        <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={handleSave}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold border transition",
              saved ? "bg-green-800 border-green-600 text-green-200" : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"
            )}
          >
            <Save className="w-4 h-4" />
            {saved ? "저장됨" : "임시 저장"}
          </button>
          <button
            onClick={handleSubmitAll}
            disabled={!canSubmitAll}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            미입력 전체 제출
          </button>
        </div>
      )}
    </div>
  );
}
