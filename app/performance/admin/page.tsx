"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell, Lock, Unlock, Eye, EyeOff, Plus, Calendar,
  ChevronDown, AlertTriangle, CheckCircle2, Clock, History, X, Info,
  Database, Target, Edit3, Save, RefreshCw,
} from "lucide-react";
import { REAL_INDEXES } from "@/lib/realData";
import type { CompositeIndex, IndexStatus } from "@/lib/mockData";
import { cn, round, calcDynamicComp, formatNumber } from "@/lib/utils";
import { usePerformanceStore } from "@/lib/store";
import type { SessionStatus, SubState } from "@/lib/store";

export default function AdminDashboardPage() {
  const {
    sessions, activeYear, setActiveYear,
    createSession, openSession, closeSession, updateDeadline,
    getIndexStatus, getCompletionRate, getPendingDepts,
    approveIndex, togglePublic, hydrateFromDB, loadSessionsFromDB,
    liveIndexes, refreshIndexes,
    adminEditValue, setTargetValue,
  } = usePerformanceStore();

  // DB에서 전체 세션·실적 로드 (새로고침 후에도 연도 탭 유지)
  useEffect(() => {
    loadSessionsFromDB();
  }, [loadSessionsFromDB]);

  // 연도 전환 시 해당 연도 데이터 보강 로드
  useEffect(() => {
    hydrateFromDB(activeYear);
  }, [activeYear, hydrateFromDB]);

  const indexes = liveIndexes ?? REAL_INDEXES;

  const [showNewSession, setShowNewSession] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear() + 1);
  const [newDeadline, setNewDeadline] = useState("");
  const [editDeadline, setEditDeadline] = useState(false);
  const [deadlineInput, setDeadlineInput] = useState("");

  // ── 마스터 코드 상태 ──────────────────────────────────────
  interface MasterCodeItem { id: string; code: string; name: string; value: number; year: number }
  const [masterCodes, setMasterCodes] = useState<MasterCodeItem[]>([]);
  const [showMasterCodes, setShowMasterCodes] = useState(false);
  const [editingMC, setEditingMC] = useState<Record<string, string>>({});
  const [savingMC, setSavingMC] = useState<string | null>(null);

  const loadMasterCodes = useCallback(async () => {
    const res = await fetch(`/api/perf-master-codes?year=${activeYear}`);
    if (res.ok) setMasterCodes(await res.json());
  }, [activeYear]);

  useEffect(() => { if (showMasterCodes) loadMasterCodes(); }, [showMasterCodes, loadMasterCodes]);

  const saveMasterCode = async (code: string) => {
    const val = editingMC[code];
    if (val === undefined) return;
    setSavingMC(code);
    await fetch("/api/perf-master-codes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, year: activeYear, value: Number(val) }),
    });
    await loadMasterCodes();
    setEditingMC((prev) => { const n = { ...prev }; delete n[code]; return n; });
    setSavingMC(null);
  };

  const sortedYears = Object.keys(sessions).map(Number).sort((a, b) => b - a);
  const session = sessions[activeYear];

  const counts = {
    total: indexes.length,
    approved:   indexes.filter((i) => getIndexStatus(activeYear, i.id) === "APPROVED").length,
    pending:    indexes.filter((i) => getIndexStatus(activeYear, i.id) === "PENDING").length,
    collecting: indexes.filter((i) => getIndexStatus(activeYear, i.id) === "COLLECTING").length,
  };

  const handleCreateSession = () => {
    if (!newYear) return;
    createSession(newYear, newDeadline || null);
    setShowNewSession(false);
    setNewYear(new Date().getFullYear() + 1);
    setNewDeadline("");
  };

  const handleSaveDeadline = () => {
    updateDeadline(activeYear, deadlineInput || null);
    setEditDeadline(false);
  };

  const sessionStatusMeta: Record<SessionStatus, { label: string; color: string; bg: string }> = {
    OPEN:     { label: "입력 진행중", color: "text-green-400",  bg: "bg-green-900/30 border-green-800" },
    CLOSED:   { label: "입력 마감",   color: "text-slate-400",  bg: "bg-slate-800/60 border-slate-700" },
    APPROVED: { label: "공시 완료",   color: "text-purple-400", bg: "bg-purple-900/30 border-purple-800" },
  };
  const sm = session ? sessionStatusMeta[session.status] : null;

  // 기한 초과 여부
  const deadlineExpired = session?.deadline
    ? new Date() > new Date(session.deadline + "T23:59:59")
    : false;

  return (
    <div className="p-6 md:p-8 animate-fade-in">
      {/* ── 헤더 ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-white mb-1">성과 관리 총괄</h1>
        <p className="text-slate-400 text-sm">연도별 실적 수집 세션을 관리하고 최종 공시를 승인합니다.</p>
      </div>

      {/* ── 연도 탭 ── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {sortedYears.map((year) => {
          const s = sessions[year];
          const dot = s.status === "OPEN" ? "bg-green-400" : s.status === "APPROVED" ? "bg-purple-400" : "bg-slate-500";
          return (
            <button
              key={year}
              onClick={() => setActiveYear(year)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition",
                activeYear === year
                  ? "bg-purple-700 border-purple-500 text-white"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
              )}
            >
              <span className={cn("w-2 h-2 rounded-full", dot)} />
              {year}년
            </button>
          );
        })}

        {/* 새 세션 추가 */}
        <button
          onClick={() => setShowNewSession(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border border-dashed border-slate-600 text-slate-500 hover:border-purple-600 hover:text-purple-400 transition"
        >
          <Plus className="w-4 h-4" />
          새 연도 개설
        </button>
      </div>

      {/* 새 세션 생성 폼 */}
      {showNewSession && (
        <div className="mb-4 p-4 bg-slate-900 border border-purple-700 rounded-xl flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs text-slate-400 font-semibold block mb-1">연도</label>
            <input
              type="number" value={newYear} onChange={(e) => setNewYear(Number(e.target.value))}
              className="bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-semibold block mb-1">입력 마감일 (선택)</label>
            <input
              type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)}
              className="bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreateSession} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-lg transition">
              개설
            </button>
            <button onClick={() => setShowNewSession(false)} className="px-4 py-2 bg-slate-700 text-slate-300 text-sm font-bold rounded-lg transition">
              취소
            </button>
          </div>
        </div>
      )}

      {/* ── 세션 상태 배너 ── */}
      {session && sm && (
        <div className={cn("mb-6 p-4 border rounded-xl flex flex-wrap items-center justify-between gap-4", sm.bg)}>
          <div className="flex items-center gap-3">
            {session.status === "OPEN"
              ? <CheckCircle2 className="w-5 h-5 text-green-400" />
              : session.status === "APPROVED"
              ? <Lock className="w-5 h-5 text-purple-400" />
              : <Clock className="w-5 h-5 text-slate-400" />}
            <div>
              <p className={cn("font-bold text-sm", sm.color)}>
                {activeYear}년 세션 · {sm.label}
              </p>
              <div className="flex items-center gap-3 mt-0.5">
                {editDeadline ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="date" value={deadlineInput}
                      onChange={(e) => setDeadlineInput(e.target.value)}
                      className="bg-slate-700 border border-slate-500 text-white text-xs rounded px-2 py-1 focus:outline-none"
                    />
                    <button onClick={handleSaveDeadline} className="text-xs text-green-400 font-bold">저장</button>
                    <button onClick={() => setEditDeadline(false)} className="text-xs text-slate-500">취소</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setDeadlineInput(session.deadline ?? ""); setEditDeadline(true); }}
                    className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition"
                  >
                    <Calendar className="w-3 h-3" />
                    {session.deadline
                      ? `입력 기한: ${session.deadline}${deadlineExpired ? " (만료됨)" : ""}`
                      : "기한 없음"}
                    {session.status !== "APPROVED" && <span className="text-slate-600">(수정)</span>}
                  </button>
                )}
                {session.editLogs.length > 0 && (
                  <span className="text-xs text-slate-600 flex items-center gap-1">
                    <History className="w-3 h-3" /> 수정 이력 {session.editLogs.length}건
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 세션 전환 버튼 */}
          {session.status !== "APPROVED" && (
            <div className="flex gap-2">
              {session.status === "OPEN" ? (
                <button
                  onClick={() => closeSession(activeYear)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-lg transition"
                >
                  <Lock className="w-3 h-3" /> 입력 마감하기
                </button>
              ) : (
                <button
                  onClick={() => openSession(activeYear)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-800 hover:bg-green-700 text-green-200 text-xs font-bold rounded-lg transition"
                >
                  <Unlock className="w-3 h-3" /> 입력 재개방
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 마스터 코드 관리 ── */}
      <div className="mb-6 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowMasterCodes((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-800/40 transition"
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-bold text-slate-300">마스터 코드 관리</span>
            <span className="text-xs text-slate-600">({activeYear}년 기준값)</span>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform", showMasterCodes && "rotate-180")} />
        </button>
        {showMasterCodes && (
          <div className="border-t border-slate-800 p-4">
            <p className="text-xs text-slate-500 mb-3">
              MASTER_AUTO 하위지표에 자동 연동되는 기준값입니다. 수정 시 실적 입력 페이지에 즉시 반영됩니다.
            </p>
            {masterCodes.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-4">
                마스터 코드가 없습니다. (연도: {activeYear})
              </p>
            ) : (
              <div className="space-y-2">
                {masterCodes.map((mc) => (
                  <div key={mc.code} className="flex items-center gap-3 bg-slate-800/40 border border-slate-700/50 rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-300 truncate">{mc.name}</p>
                      <p className="text-xs text-slate-600 font-mono">{mc.code}</p>
                    </div>
                    {editingMC[mc.code] !== undefined ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <input
                          type="number"
                          value={editingMC[mc.code]}
                          onChange={(e) => setEditingMC((prev) => ({ ...prev, [mc.code]: e.target.value }))}
                          className="w-32 bg-slate-700 border border-purple-600 text-white text-sm text-right rounded-lg px-2 py-1 focus:outline-none"
                        />
                        <button
                          onClick={() => saveMasterCode(mc.code)}
                          disabled={savingMC === mc.code}
                          className="flex items-center gap-1 px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                        >
                          {savingMC === mc.code ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          저장
                        </button>
                        <button
                          onClick={() => setEditingMC((prev) => { const n = { ...prev }; delete n[mc.code]; return n; })}
                          className="text-xs text-slate-500 hover:text-slate-300 transition"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-bold text-blue-300">{formatNumber(mc.value)}</span>
                        <button
                          onClick={() => setEditingMC((prev) => ({ ...prev, [mc.code]: String(mc.value) }))}
                          className="p-1 text-slate-600 hover:text-blue-400 transition"
                          title="수정"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 전체 카운터 ── */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "전체 지수", value: counts.total, color: "text-white" },
          { label: "취합 진행중", value: counts.collecting, color: "text-blue-400" },
          { label: "승인 대기", value: counts.pending, color: "text-yellow-400" },
          { label: "공시 완료", value: counts.approved, color: "text-green-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 font-semibold mb-1">{label}</p>
            <p className={cn("text-2xl font-black", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── 지수 카드 그리드 ── */}
      {session ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {indexes.map((idx) => {
            const status = getIndexStatus(activeYear, idx.id);
            const completion = getCompletionRate(activeYear, idx.id);
            const pendingDepts = getPendingDepts(activeYear, idx.id);
            const isPublic = session.indexPublic[idx.id] ?? false;
            const sessionClosed = session.status !== "OPEN";

            // 동적 점수 계산 (제출값 기반)
            let dynamicScore: number | null = 0;
            let hasNull = false;
            let hasData = false;
            for (const comp of idx.components) {
              const { dynamicAchieveRate } = calcDynamicComp(comp, session.submissions);
              if (dynamicAchieveRate === null) {
                hasNull = true;
              } else {
                hasData = true;
                dynamicScore! += Math.min(dynamicAchieveRate, 100) * (comp.weight / 100);
              }
            }
            const finalScore = !hasData && hasNull ? null : dynamicScore;
            const isPartial = hasNull && hasData;

            return (
              <AdminIndexCard
                key={idx.id}
                index={idx}
                indexScore={finalScore}
                isPartial={isPartial}
                status={status}
                isPublic={isPublic}
                completion={completion}
                pendingDepts={pendingDepts}
                sessionClosed={sessionClosed}
                submissions={session.submissions}
                targetValues={session.targetValues ?? {}}
                sessionStatus={session.status}
                year={activeYear}
                onTogglePublic={() => togglePublic(activeYear, idx.id)}
                onApprove={() => approveIndex(activeYear, idx.id)}
                onAdminEdit={(subId, value, reason) => adminEditValue(activeYear, subId, value, reason)}
                onSetTarget={(subId, value) => setTargetValue(activeYear, subId, value)}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 text-slate-600">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-semibold">선택된 연도의 세션이 없습니다.</p>
          <p className="text-sm mt-1">위에서 새 연도를 개설해주세요.</p>
        </div>
      )}
    </div>
  );
}

// ── AdminIndexCard ──────────────────────────────────────────
// ── 산식/점수 모달 ────────────────────────────────────────────
interface FormulaModalInfo {
  compId: string;
  compName: string;
  formula: string;
  weight: number;
  subs: { id: string; name: string; variableKey: string; deptName: string; unit: string; targetValue: number; actualValue: number | null; submittedValue: number | null; isSubmitted: boolean }[];
}

function FormulaModal({ info, onClose }: { info: FormulaModalInfo; onClose: () => void }) {
  // 실제 점수 계산: 제출된 값 기준 달성률
  const submittedSubs = info.subs.filter((s) => s.isSubmitted && s.submittedValue != null);
  const allSubmitted = submittedSubs.length === info.subs.length && info.subs.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-start justify-between p-5 border-b border-slate-800">
          <div>
            <p className="text-xs text-slate-500 font-semibold mb-0.5">[{info.compId}] 가중치 {Math.round(info.weight)}%</p>
            <h3 className="font-bold text-white text-base">{info.compName}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 transition text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* 산식 */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <p className="text-xs text-slate-500 font-semibold mb-1">산출 산식</p>
            <p className="font-mono text-sm text-purple-300 font-bold">{info.formula}</p>
          </div>

          {/* 변수별 제출값 */}
          <div>
            <p className="text-xs text-slate-500 font-semibold mb-2">변수별 실적</p>
            <div className="space-y-2">
              {info.subs.map((sub) => {
                const achieve = sub.isSubmitted && sub.submittedValue != null && sub.targetValue > 0
                  ? Math.min((sub.submittedValue / sub.targetValue) * 100, 150)
                  : null;
                return (
                  <div key={sub.id} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-800/60 text-purple-200 text-xs font-black flex items-center justify-center">
                          {sub.variableKey}
                        </span>
                        <span className="text-xs font-semibold text-slate-300">{sub.name}</span>
                      </div>
                      {sub.isSubmitted ? (
                        <span className="text-xs font-bold text-green-400 bg-green-900/30 border border-green-800 px-2 py-0.5 rounded-full">
                          제출완료
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-yellow-400 bg-yellow-900/30 border border-yellow-800 px-2 py-0.5 rounded-full">
                          미제출
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1.5 pl-8">
                      <span className="text-slate-600">{sub.deptName}</span>
                      <div className="text-right">
                        <span className={sub.isSubmitted ? "text-white font-bold" : "text-slate-600"}>
                          {sub.isSubmitted && sub.submittedValue != null
                            ? `${sub.submittedValue} ${sub.unit}`
                            : "—"}
                        </span>
                        <span className="text-slate-600 ml-1">/ 목표 {sub.targetValue} {sub.unit}</span>
                      </div>
                    </div>
                    {achieve != null && (
                      <div className="mt-2 pl-8">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", achieve >= 100 ? "bg-green-500" : achieve >= 70 ? "bg-purple-500" : "bg-yellow-500")}
                              style={{ width: `${Math.min(achieve, 100)}%` }}
                            />
                          </div>
                          <span className={cn("text-xs font-bold w-12 text-right", achieve >= 100 ? "text-green-400" : achieve >= 70 ? "text-purple-300" : "text-yellow-400")}>
                            {round(achieve, 1)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 미제출 안내 */}
          {!allSubmitted && (
            <p className="text-xs text-slate-600 text-center">* 모든 부서가 제출 완료되면 최종 점수가 산출됩니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminIndexCard({
  index, indexScore, isPartial,
  status, isPublic, completion, pendingDepts,
  sessionClosed, submissions, targetValues, sessionStatus,
  year,
  onTogglePublic, onApprove, onAdminEdit, onSetTarget,
}: {
  index: CompositeIndex; indexScore: number | null; isPartial: boolean;
  status: IndexStatus; isPublic: boolean;
  completion: { submitted: number; total: number };
  pendingDepts: string[];
  sessionClosed: boolean;
  submissions: Record<string, SubState>;
  targetValues: Record<string, number | null>;
  sessionStatus: SessionStatus;
  year: number;
  onTogglePublic: () => void;
  onApprove: () => void;
  onAdminEdit: (subId: string, value: number | null, reason: string) => void;
  onSetTarget: (subId: string, value: number | null) => void;
}) {
  const [showDepts, setShowDepts] = useState(false);
  const [expandedComps, setExpandedComps] = useState<Set<string>>(new Set());
  const [modalInfo, setModalInfo] = useState<FormulaModalInfo | null>(null);
  // 목표값 설정 모달
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetDraft, setTargetDraft] = useState<Record<string, string>>({});
  // 과거연도 실적 수정 (인라인)
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editReason, setEditReason] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const toggleComp = (compId: string) =>
    setExpandedComps((prev) => {
      const next = new Set(prev);
      next.has(compId) ? next.delete(compId) : next.add(compId);
      return next;
    });

  const openModal = (comp: CompositeIndex["components"][number]) => {
    setModalInfo({
      compId: comp.id,
      compName: comp.name,
      formula: comp.formula,
      weight: comp.weight,
      subs: comp.subIndicators.map((sub) => ({
        id: sub.id,
        name: sub.name,
        variableKey: sub.variableKey,
        deptName: sub.deptName,
        unit: sub.unit,
        targetValue: targetValues[sub.id] ?? sub.targetValue,
        actualValue: sub.actualValue,
        submittedValue: submissions[sub.id]?.actualValue ?? null,
        isSubmitted: submissions[sub.id]?.status === "SUBMITTED",
      })),
    });
  };

  const handleAdminEdit = async (subId: string) => {
    if (!editValue) return;
    setSavingEdit(true);
    await onAdminEdit(subId, Number(editValue), editReason || "관리자 직접 수정");
    setEditingSubId(null);
    setEditValue("");
    setEditReason("");
    setSavingEdit(false);
  };

  const openTargetModal = () => {
    const draft: Record<string, string> = {};
    index.components.forEach((comp) =>
      comp.subIndicators.forEach((sub) => {
        draft[sub.id] = String(targetValues[sub.id] ?? sub.targetValue ?? "");
      })
    );
    setTargetDraft(draft);
    setShowTargetModal(true);
  };

  const saveAllTargets = async () => {
    await Promise.all(
      Object.entries(targetDraft).map(([subId, val]) =>
        onSetTarget(subId, val !== "" ? Number(val) : null)
      )
    );
    setShowTargetModal(false);
  };

  const submittedPct = completion.total > 0
    ? round((completion.submitted / completion.total) * 100, 0) : 0;

  const statusMeta: Record<IndexStatus, { label: string; color: string }> = {
    APPROVED:   { label: "공시 완료",   color: "bg-green-900/40 text-green-400 border-green-800" },
    PENDING:    { label: "승인 대기",   color: "bg-yellow-900/40 text-yellow-400 border-yellow-800" },
    COLLECTING: { label: "취합 진행중", color: "bg-blue-900/40 text-blue-400 border-blue-800" },
  };
  const borderColor: Record<IndexStatus, string> = {
    APPROVED: "border-t-green-500", PENDING: "border-t-yellow-500", COLLECTING: "border-t-blue-500",
  };
  const sm = statusMeta[status];

  return (
    <>
      {/* 산식/점수 모달 */}
      {modalInfo && <FormulaModal info={modalInfo} onClose={() => setModalInfo(null)} />}

      {/* 목표값 설정 모달 */}
      {showTargetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowTargetModal(false)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 flex-shrink-0">
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">{index.name}</p>
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-orange-400" /> {year}년 목표값 설정
                </h3>
              </div>
              <button onClick={() => setShowTargetModal(false)} className="p-1 text-slate-500 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-3 flex-1">
              {index.components.map((comp) => (
                <div key={comp.id}>
                  <p className="text-xs text-slate-500 font-semibold mb-2">[{comp.id}] {comp.name}</p>
                  {comp.subIndicators.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-3 bg-slate-800/40 border border-slate-700/50 rounded-lg px-3 py-2 mb-1.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-300 truncate">{sub.name}</p>
                        <p className="text-xs text-slate-600">{sub.variableKey} · {sub.unit}</p>
                      </div>
                      <input
                        type="number"
                        value={targetDraft[sub.id] ?? ""}
                        onChange={(e) => setTargetDraft((prev) => ({ ...prev, [sub.id]: e.target.value }))}
                        placeholder="목표값"
                        className="w-28 bg-slate-700 border border-slate-600 text-white text-sm text-right rounded-lg px-2 py-1.5 focus:outline-none focus:border-orange-500"
                      />
                      <span className="text-xs text-slate-500 w-8 flex-shrink-0">{sub.unit}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-800 flex gap-2 flex-shrink-0">
              <button
                onClick={saveAllTargets}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition"
              >
                <Save className="w-4 h-4" /> 목표값 저장
              </button>
              <button onClick={() => setShowTargetModal(false)} className="px-4 py-2 text-sm text-slate-400 bg-slate-800 rounded-lg hover:bg-slate-700 transition">취소</button>
            </div>
          </div>
        </div>
      )}

    <div className={cn("bg-slate-900 border border-slate-800 border-t-4 rounded-xl overflow-hidden flex flex-col", borderColor[status])}>
      <div className="p-5 flex-1">
        {/* 헤더 */}
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">ID: {index.id}</span>
          <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border", sm.color)}>{sm.label}</span>
        </div>
        <h3 className="font-bold text-white text-base leading-tight mb-4 line-clamp-2">{index.name}</h3>

        {/* 실적 입력 현황 바 */}
        <div className="bg-slate-950/50 rounded-lg p-3 mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-slate-400 font-semibold">실적 입력 현황</span>
            <span className="text-xs font-bold text-white">{completion.submitted} / {completion.total} 제출</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${submittedPct}%` }} />
          </div>
        </div>

        {/* 미제출 부서 알림 */}
        {status === "COLLECTING" && pendingDepts.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-800/50 rounded-lg">
            <button onClick={() => setShowDepts((v) => !v)} className="w-full flex items-center justify-between text-xs text-yellow-400 font-semibold mb-1">
              <span>⚠ 미제출 부서 {pendingDepts.length}개</span>
              <ChevronDown className={cn("w-3 h-3 transition-transform", showDepts && "rotate-180")} />
            </button>
            {showDepts && (
              <div className="flex flex-wrap gap-1 mb-2">
                {pendingDepts.map((d) => (
                  <span key={d} className="text-xs bg-yellow-900/40 text-yellow-300 px-2 py-0.5 rounded-full border border-yellow-800">{d}</span>
                ))}
              </div>
            )}
            <button className="w-full flex items-center justify-center gap-1.5 text-xs font-bold py-1.5 border border-yellow-700 text-yellow-300 rounded-lg hover:bg-yellow-900/30 transition">
              <Bell className="w-3 h-3" /> 독려 알림 발송
            </button>
          </div>
        )}

        {status === "PENDING" && (
          <div className="mb-4 p-3 bg-green-900/20 border border-green-800/50 rounded-lg">
            <p className="text-xs text-green-400 font-semibold">✓ 모든 부서 제출 완료 — 승인 가능</p>
          </div>
        )}

        {/* ── 구성지표별 실적 제출 현황 ── */}
        {status !== "APPROVED" && index.components.length > 0 && (
          <div className="mb-4 space-y-1.5">
            <p className="text-xs text-slate-500 font-semibold mb-2">구성지표별 실적 현황</p>
            {index.components.map((comp) => {
              const isOpen = expandedComps.has(comp.id);
              const hasSubs = comp.subIndicators.length > 0;
              const allSubmitted = hasSubs && comp.subIndicators.every(
                (s) => submissions[s.id]?.status === "SUBMITTED"
              );
              return (
                <div key={comp.id} className="bg-slate-800/40 border border-slate-700/50 rounded-lg overflow-hidden">
                  {/* 구성지표 행 */}
                  <div className="flex items-center">
                    <button
                      onClick={() => hasSubs && toggleComp(comp.id)}
                      className={cn(
                        "flex-1 flex items-center justify-between px-3 py-2 text-left transition",
                        hasSubs ? "hover:bg-slate-700/40 cursor-pointer" : "cursor-default"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full flex-shrink-0",
                          !hasSubs ? "bg-slate-600" : allSubmitted ? "bg-green-400" : "bg-yellow-400"
                        )} />
                        <span className="text-xs font-semibold text-slate-300 truncate">{comp.name}</span>
                        <span className="text-xs text-slate-600 flex-shrink-0">({Math.round(comp.weight)}%)</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {hasSubs ? (
                          <>
                            <span className={cn(
                              "text-xs font-bold",
                              allSubmitted ? "text-green-400" : "text-yellow-400"
                            )}>
                              {comp.subIndicators.filter((s) => submissions[s.id]?.status === "SUBMITTED").length}
                              /{comp.subIndicators.length}
                            </span>
                            <ChevronDown className={cn("w-3 h-3 text-slate-500 transition-transform", isOpen && "rotate-180")} />
                          </>
                        ) : (
                          <span className="text-xs text-slate-600">하위지표 없음</span>
                        )}
                      </div>
                    </button>
                    {/* 산식/점수 보기 버튼 */}
                    <button
                      onClick={(e) => { e.stopPropagation(); openModal(comp); }}
                      className="flex-shrink-0 px-2 py-2 text-slate-600 hover:text-purple-400 transition"
                      title="산식 및 실적 상세 보기"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>

                      {/* 하위지표 행 목록 */}
                  {hasSubs && isOpen && (
                    <div className="border-t border-slate-700/50 divide-y divide-slate-700/30">
                      {comp.subIndicators.map((sub) => {
                        const subState = submissions[sub.id];
                        const isSubmitted = subState?.status === "SUBMITTED";
                        const subTarget = targetValues[sub.id] ?? sub.targetValue;
                        const isEditingThis = editingSubId === sub.id;
                        return (
                          <div key={sub.id} className="px-3 py-2 gap-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-slate-400 truncate">{sub.name}</p>
                                <p className="text-xs text-slate-600">{sub.deptName}</p>
                              </div>
                              <div className="text-right flex-shrink-0 flex items-center gap-2">
                                {isSubmitted ? (
                                  <div>
                                    <p className="text-xs font-bold text-green-300">
                                      {subState.actualValue != null
                                        ? `${formatNumber(subState.actualValue)} ${sub.unit}`
                                        : "—"}
                                    </p>
                                    <p className="text-xs text-slate-600">
                                      목표 {formatNumber(subTarget)} {sub.unit}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-xs font-semibold text-yellow-500">미제출</span>
                                )}
                                {/* 관리자 수정 버튼 (CLOSED/APPROVED 세션) */}
                                {(sessionStatus === "CLOSED" || sessionStatus === "APPROVED") && !isEditingThis && (
                                  <button
                                    onClick={() => {
                                      setEditingSubId(sub.id);
                                      setEditValue(String(subState?.actualValue ?? ""));
                                      setEditReason("");
                                    }}
                                    className="p-1 text-slate-600 hover:text-blue-400 transition"
                                    title="관리자 수정"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            {/* 관리자 인라인 편집 폼 */}
                            {isEditingThis && (
                              <div className="mt-2 p-2 bg-blue-900/20 border border-blue-800/50 rounded-lg space-y-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    placeholder="수정 실적값"
                                    className="flex-1 bg-slate-700 border border-blue-600 text-white text-xs rounded px-2 py-1 focus:outline-none"
                                  />
                                  <span className="text-xs text-slate-500">{sub.unit}</span>
                                </div>
                                <input
                                  type="text"
                                  value={editReason}
                                  onChange={(e) => setEditReason(e.target.value)}
                                  placeholder="수정 사유 (선택)"
                                  className="w-full bg-slate-700 border border-slate-600 text-white text-xs rounded px-2 py-1 focus:outline-none"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleAdminEdit(sub.id)}
                                    disabled={!editValue || savingEdit}
                                    className="flex-1 flex items-center justify-center gap-1 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded transition disabled:opacity-40"
                                  >
                                    <Save className="w-3 h-3" /> 저장
                                  </button>
                                  <button
                                    onClick={() => { setEditingSubId(null); setEditValue(""); setEditReason(""); }}
                                    className="px-3 py-1 text-xs text-slate-500 hover:text-slate-300 transition"
                                  >취소</button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 동적 종합 점수 — 항상 표시 */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 mb-4 text-center">
          <p className="text-xs text-slate-500 mb-1 font-semibold">
            {status === "APPROVED"
              ? "확정 점수"
              : isPartial
              ? "현재 집계 (부분)"
              : "예상 점수"}
          </p>
          {indexScore == null ? (
            <p className="text-3xl font-black text-slate-600">—</p>
          ) : (
            <p className={cn(
              "text-3xl font-black",
              status === "APPROVED" ? "text-white" : isPartial ? "text-yellow-300" : "text-purple-300"
            )}>
              {round(indexScore, 1)}
            </p>
          )}
          <p className="text-xs text-slate-600">/ 100점</p>
          {isPartial && (
            <p className="text-xs text-yellow-600 mt-0.5">일부 미제출 항목 포함</p>
          )}
        </div>
      </div>

      <div className="border-t border-slate-800 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-semibold">대외 공개</span>
          <button onClick={onTogglePublic} disabled={status !== "APPROVED"}
            className={cn(
              "flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition",
              isPublic ? "bg-emerald-900/40 border-emerald-700 text-emerald-300" : "bg-slate-800 border-slate-700 text-slate-400",
              status !== "APPROVED" && "opacity-50 cursor-not-allowed"
            )}>
            {isPublic ? <><Eye className="w-3 h-3" /> 공개</> : <><EyeOff className="w-3 h-3" /> 비공개</>}
          </button>
        </div>

        {/* 목표값 설정 버튼 */}
        <button
          onClick={openTargetModal}
          className="w-full flex items-center justify-center gap-2 py-1.5 text-xs font-bold text-orange-400 border border-orange-800/50 bg-orange-900/20 hover:bg-orange-900/40 rounded-lg transition"
        >
          <Target className="w-3.5 h-3.5" /> 목표값 설정
        </button>

        {status !== "APPROVED" ? (
          <button onClick={onApprove} disabled={status !== "PENDING"}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition disabled:opacity-40 disabled:cursor-not-allowed">
            <Unlock className="w-4 h-4" />
            {status === "PENDING" ? "최종 공시 승인" : "제출 완료 후 승인 가능"}
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 py-2 text-sm font-bold text-green-400">
            <Lock className="w-4 h-4" /> 승인 완료 · 잠금됨
          </div>
        )}
      </div>
    </div>
    </>
  );
}
