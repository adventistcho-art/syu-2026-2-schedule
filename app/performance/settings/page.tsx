"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FolderOpen, FileText, Plus, Settings, Save, CheckCircle2,
  AlertCircle, Loader2, Trash2, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePerformanceStore } from "@/lib/store";

// ── DB 타입 ───────────────────────────────────────────────────
interface SubIndicatorDB {
  id: string;
  componentId: string;
  name: string;
  description: string | null;
  variableKey: string;
  deptName: string;
  unit: string;
  inputType: string;
  masterCode: string | null;
}
interface ComponentDB {
  id: string;
  indexId: string;
  name: string;
  weight: number;
  formula: string;
  targetValue: number | null;
  unit: string;
  subIndicators: SubIndicatorDB[];
}
interface CompositeIndexDB {
  id: string;
  name: string;
  category: string;
  description: string;
  formula: string;
  targetScore: number;
  isPublic: boolean;
  components: ComponentDB[];
}

// ── 상수 ──────────────────────────────────────────────────────
const DEPT_OPTIONS = [
  "학사지원팀", "교양교육원", "연구처", "산학협력단", "기획처", "교무처", "학생처",
  "IR센터", "교수학습개발센터", "시설관리팀", "학생지원팀", "취창업지원팀",
  "입학처", "국제교육원", "학생복지팀", "혁신기획처",
];
const MASTER_CODES = [
  { code: "ENROLLED_STUDENTS_UG", name: "학부 재학생 수" },
  { code: "ENROLLED_STUDENTS", name: "재학생 수(전체)" },
  { code: "ENROLLED_STUDENTS_AVG", name: "재학생 수(1·2학기 평균)" },
  { code: "TOTAL_COURSES", name: "전체 개설 교과목 수" },
  { code: "MAJOR_COURSES", name: "전공 개설 교과목 수" },
  { code: "LIBERAL_ARTS_COURSES", name: "교양 개설 교과목 수" },
  { code: "FULL_TIME_FACULTY", name: "전임교원 수" },
  { code: "GRADUATES", name: "졸업생 수" },
];

// 변수 키 후보: A~Z
const VARIABLE_KEYS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// ── 새 구성지표 폼 기본값 ─────────────────────────────────────
function emptyComp(indexId: string): Partial<ComponentDB> {
  return { indexId, name: "", weight: 0, formula: "A", unit: "", targetValue: null };
}

// ── 새 하위지표 폼 기본값 ─────────────────────────────────────
function emptySub(componentId: string): Partial<SubIndicatorDB> {
  return {
    componentId, name: "", variableKey: "A",
    deptName: DEPT_OPTIONS[0], unit: "", inputType: "MANUAL",
    description: "", masterCode: null,
  };
}

// ═══════════════════════════════════════════════════════════════
export default function SettingsPage() {
  const refreshStoreIndexes = usePerformanceStore((s) => s.refreshIndexes);
  const [indexes, setIndexes] = useState<CompositeIndexDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ indexId: string; compId: string | null }>({
    indexId: "", compId: null,
  });

  // 편집 중인 구성지표 필드
  const [editComp, setEditComp] = useState<Partial<ComponentDB>>({});
  // 편집 중인 하위지표 필드 (subId → 변경값)
  const [editSubs, setEditSubs] = useState<Record<string, Partial<SubIndicatorDB>>>({});

  const [formula, setFormula] = useState("");
  const [validated, setValidated] = useState<null | boolean>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  // 새 구성지표 추가 폼
  const [addingComp, setAddingComp] = useState<string | null>(null); // indexId
  const [newComp, setNewComp] = useState<Partial<ComponentDB>>({});

  // 새 하위지표 추가 폼 (compId → draft)
  const [addingSub, setAddingSub] = useState<string | null>(null); // compId
  const [newSub, setNewSub] = useState<Partial<SubIndicatorDB>>({});

  // 삭제 확인 모달
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: "comp"; id: string; name: string }
    | { type: "sub"; id: string; name: string }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  // ── DB 로드 ───────────────────────────────────────────────
  const loadIndexes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/perf-indexes");
      const data: CompositeIndexDB[] = await res.json();
      setIndexes(data);
      // store도 동기화
      await refreshStoreIndexes();
      if (data.length > 0 && !selected.indexId) {
        const first = data[0];
        const firstComp = first.components[0] ?? null;
        setSelected({ indexId: first.id, compId: firstComp?.id ?? null });
        if (firstComp) { setEditComp(firstComp); setFormula(firstComp.formula); }
      }
    } finally {
      setLoading(false);
    }
  }, [selected.indexId]);

  useEffect(() => { loadIndexes(); }, []); // 마운트 1회

  const selectedIndex = indexes.find((i) => i.id === selected.indexId);
  const selectedComp = selectedIndex?.components.find((c) => c.id === selected.compId);

  // 현재 지수의 가중치 합 (선택된 구성지표 편집 값 반영)
  const weightSum = selectedIndex?.components.reduce((sum, c) => {
    const w = c.id === selected.compId ? (editComp.weight ?? c.weight) : c.weight;
    return sum + Number(w);
  }, 0) ?? 0;

  const handleSelect = (indexId: string, compId: string | null) => {
    setSelected({ indexId, compId });
    setValidated(null);
    setEditSubs({});
    setSavedMsg("");
    setAddingComp(null);
    setAddingSub(null);
    if (compId) {
      const comp = indexes.find((i) => i.id === indexId)?.components.find((c) => c.id === compId);
      if (comp) { setEditComp(comp); setFormula(comp.formula); }
    }
  };

  const handleValidate = () => {
    const vars = formula.match(/[A-Z]/g) ?? [];
    const unique = Array.from(new Set(vars));
    const mapped = selectedComp?.subIndicators.map((s) => s.variableKey) ?? [];
    setValidated(unique.every((v) => mapped.includes(v)));
  };

  // ── 구성지표 저장 ────────────────────────────────────────
  const handleSave = async () => {
    if (!selected.compId) return;
    setSaving(true); setSavedMsg("");
    try {
      await fetch(`/api/perf-components/${selected.compId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editComp.name, weight: editComp.weight, formula, targetValue: editComp.targetValue, unit: editComp.unit }),
      });
      for (const [subId, changes] of Object.entries(editSubs)) {
        if (!Object.keys(changes).length) continue;
        await fetch(`/api/perf-sub-indicators/${subId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(changes),
        });
      }
      setSavedMsg("저장 완료!");
      setEditSubs({});
      await loadIndexes();
      setTimeout(() => setSavedMsg(""), 3000);
    } catch {
      setSavedMsg("저장 실패");
    } finally {
      setSaving(false);
    }
  };

  // ── 구성지표 추가 ────────────────────────────────────────
  const handleAddComp = async () => {
    if (!addingComp || !newComp.name) return;
    setSaving(true);
    try {
      const res = await fetch("/api/perf-components", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ indexId: addingComp, ...newComp }),
      });
      if (!res.ok) throw new Error();
      const created: ComponentDB = await res.json();
      setAddingComp(null);
      setNewComp({});
      await loadIndexes();
      // 새로 만든 구성지표 자동 선택
      setSelected({ indexId: addingComp, compId: created.id });
      setEditComp(created);
      setFormula(created.formula);
    } catch {
      setSavedMsg("구성지표 추가 실패");
    } finally {
      setSaving(false);
    }
  };

  // ── 하위지표 추가 ────────────────────────────────────────
  const handleAddSub = async () => {
    if (!addingSub || !newSub.name || !newSub.variableKey) return;
    setSaving(true);
    try {
      await fetch("/api/perf-sub-indicators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ componentId: addingSub, ...newSub }),
      });
      setAddingSub(null);
      setNewSub({});
      await loadIndexes();
    } catch {
      setSavedMsg("하위지표 추가 실패");
    } finally {
      setSaving(false);
    }
  };

  // ── 삭제 실행 ────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const url = deleteTarget.type === "comp"
        ? `/api/perf-components/${deleteTarget.id}`
        : `/api/perf-sub-indicators/${deleteTarget.id}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDeleteTarget(null);
      await loadIndexes();
      if (deleteTarget.type === "comp" && deleteTarget.id === selected.compId) {
        setSelected((s) => ({ ...s, compId: null }));
      }
    } catch {
      setSavedMsg("삭제 실패");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> 불러오는 중...
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-0px)] animate-fade-in">
      {/* ── 좌측 트리 ─────────────────────────────────────── */}
      <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-purple-400" />
            지표 체계도 (2025년)
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-3 text-sm space-y-1">
          {indexes.map((idx) => (
            <TreeNode
              key={idx.id}
              index={idx}
              selected={selected}
              onSelect={handleSelect}
              onAddComp={(indexId) => {
                setAddingComp(indexId);
                setNewComp(emptyComp(indexId));
                setSelected({ indexId, compId: null });
              }}
              onDeleteComp={(compId, compName) =>
                setDeleteTarget({ type: "comp", id: compId, name: compName })
              }
            />
          ))}
        </div>
      </aside>

      {/* ── 우측 편집 영역 ────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-slate-950">
        {/* 새 구성지표 추가 폼 */}
        {addingComp && (
          <AddCompForm
            indexId={addingComp}
            value={newComp}
            onChange={setNewComp}
            onSave={handleAddComp}
            onCancel={() => { setAddingComp(null); setNewComp({}); }}
            saving={saving}
          />
        )}

        {/* 기존 구성지표 편집 폼 */}
        {!addingComp && selectedComp && selectedIndex ? (
          <CompSettings
            index={selectedIndex}
            comp={selectedComp}
            editComp={editComp}
            onEditComp={(patch) => setEditComp((prev) => ({ ...prev, ...patch }))}
            editSubs={editSubs}
            onEditSub={(subId, patch) =>
              setEditSubs((prev) => ({ ...prev, [subId]: { ...(prev[subId] ?? {}), ...patch } }))
            }
            formula={formula}
            setFormula={(v) => { setFormula(v); setValidated(null); }}
            validated={validated}
            onValidate={handleValidate}
            onSave={handleSave}
            saving={saving}
            savedMsg={savedMsg}
            weightSum={weightSum}
            addingSub={addingSub}
            newSub={newSub}
            onSetNewSub={setNewSub}
            onStartAddSub={(compId) => {
              setAddingSub(compId);
              setNewSub(emptySub(compId));
            }}
            onAddSub={handleAddSub}
            onCancelAddSub={() => { setAddingSub(null); setNewSub({}); }}
            onDeleteSub={(subId, subName) =>
              setDeleteTarget({ type: "sub", id: subId, name: subName })
            }
          />
        ) : !addingComp ? (
          <div className="flex items-center justify-center h-full text-slate-600">
            좌측에서 구성지표를 선택하거나 [+]로 새로 추가하세요
          </div>
        ) : null}
      </main>

      {/* ── 삭제 확인 모달 ───────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-red-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
              <h3 className="text-lg font-bold text-white">삭제 확인</h3>
            </div>
            <p className="text-slate-300 text-sm mb-1">
              다음 항목을 삭제합니다. <span className="text-red-400 font-bold">연관 실적 데이터도 함께 삭제됩니다.</span>
            </p>
            <p className="text-white font-semibold text-sm bg-slate-800 rounded-lg px-3 py-2 mt-2 mb-5 truncate">
              {deleteTarget.type === "comp" ? "구성지표" : "하위지표"}: {deleteTarget.name}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 text-sm font-bold bg-red-700 hover:bg-red-600 text-white rounded-lg transition disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 트리 노드 ──────────────────────────────────────────────── */
function TreeNode({
  index, selected, onSelect, onAddComp, onDeleteComp,
}: {
  index: CompositeIndexDB;
  selected: { indexId: string; compId: string | null };
  onSelect: (indexId: string, compId: string | null) => void;
  onAddComp: (indexId: string) => void;
  onDeleteComp: (compId: string, compName: string) => void;
}) {
  const [open, setOpen] = useState(index.id === selected.indexId);

  return (
    <div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => { setOpen((v) => !v); onSelect(index.id, null); }}
          className={cn(
            "flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition text-left",
            selected.indexId === index.id && !selected.compId
              ? "bg-purple-900/40 text-purple-200"
              : "text-slate-300 hover:bg-slate-800"
          )}
        >
          <FolderOpen className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          <span className="font-semibold truncate">[{index.id}] {index.name}</span>
        </button>
        {/* 구성지표 추가 버튼 */}
        <button
          onClick={(e) => { e.stopPropagation(); onAddComp(index.id); setOpen(true); }}
          title="구성지표 추가"
          className="w-6 h-6 flex items-center justify-center rounded text-purple-400 hover:bg-purple-900/40 transition flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {open && (
        <div className="ml-5 border-l border-slate-800 pl-3 mt-1 space-y-0.5">
          {index.components.map((comp) => {
            const isSelected = selected.indexId === index.id && selected.compId === comp.id;
            return (
              <div key={comp.id} className="flex items-center gap-1 group">
                <button
                  onClick={() => onSelect(index.id, comp.id)}
                  className={cn(
                    "flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition text-left",
                    isSelected ? "bg-purple-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">[{comp.id}] {comp.name}</span>
                </button>
                {/* 구성지표 삭제 버튼 */}
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteComp(comp.id, comp.name); }}
                  title="구성지표 삭제"
                  className="w-5 h-5 flex items-center justify-center rounded text-slate-700 hover:text-red-400 hover:bg-red-900/30 transition opacity-0 group-hover:opacity-100 flex-shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── 새 구성지표 추가 폼 ────────────────────────────────────── */
function AddCompForm({
  indexId, value, onChange, onSave, onCancel, saving,
}: {
  indexId: string;
  value: Partial<ComponentDB>;
  onChange: (v: Partial<ComponentDB>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <span className="bg-green-900/50 text-green-300 text-xs font-bold px-2 py-0.5 rounded border border-green-800">
            구성지표 신규 추가
          </span>
          <h2 className="text-xl font-bold text-white mt-1">지수 [{indexId}]에 구성지표 추가</h2>
          <p className="text-slate-500 text-xs mt-1">추가 후 하위지표(변수)를 등록하세요.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition">
            취소
          </button>
          <button
            onClick={onSave}
            disabled={saving || !value.name}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-bold rounded-lg transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            추가
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="구성지표명 *">
          <input
            value={value.name ?? ""}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            className="form-input"
            placeholder="예: 교원 연구역량 지수"
          />
        </Field>
        <Field label="단위">
          <input
            value={value.unit ?? ""}
            onChange={(e) => onChange({ ...value, unit: e.target.value })}
            className="form-input"
            placeholder="예: %, 건, 명"
          />
        </Field>
        <Field label="가중치 (%)">
          <input
            type="number" min={0} max={100}
            value={value.weight ?? ""}
            onChange={(e) => onChange({ ...value, weight: Number(e.target.value) })}
            className="form-input"
          />
        </Field>
        <Field label="당해연도 목표값">
          <input
            type="number"
            value={value.targetValue ?? ""}
            onChange={(e) => onChange({ ...value, targetValue: e.target.value ? Number(e.target.value) : null })}
            className="form-input"
          />
        </Field>
        <div className="col-span-2">
          <Field label="산출식 (변수 A, B, C … 사용)">
            <input
              value={value.formula ?? ""}
              onChange={(e) => onChange({ ...value, formula: e.target.value })}
              className="form-input font-mono"
              placeholder="예: A / B × 100"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

/* ── 구성지표 세부 설정 폼 ──────────────────────────────────── */
function CompSettings({
  index, comp, editComp, onEditComp,
  editSubs, onEditSub,
  formula, setFormula, validated, onValidate,
  onSave, saving, savedMsg, weightSum,
  addingSub, newSub, onSetNewSub,
  onStartAddSub, onAddSub, onCancelAddSub,
  onDeleteSub,
}: {
  index: CompositeIndexDB;
  comp: ComponentDB;
  editComp: Partial<ComponentDB>;
  onEditComp: (p: Partial<ComponentDB>) => void;
  editSubs: Record<string, Partial<SubIndicatorDB>>;
  onEditSub: (subId: string, p: Partial<SubIndicatorDB>) => void;
  formula: string;
  setFormula: (v: string) => void;
  validated: boolean | null;
  onValidate: () => void;
  onSave: () => void;
  saving: boolean;
  savedMsg: string;
  weightSum: number;
  addingSub: string | null;
  newSub: Partial<SubIndicatorDB>;
  onSetNewSub: (v: Partial<SubIndicatorDB>) => void;
  onStartAddSub: (compId: string) => void;
  onAddSub: () => void;
  onCancelAddSub: () => void;
  onDeleteSub: (subId: string, subName: string) => void;
}) {
  const weightOk = Math.abs(weightSum - 100) < 0.1;

  return (
    <div className="p-8 max-w-3xl">
      {/* 헤더 */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <span className="bg-purple-900/50 text-purple-300 text-xs font-bold px-2 py-0.5 rounded border border-purple-800">구성지표 수정</span>
          <h2 className="text-2xl font-bold text-white mt-1">[{comp.id}] {editComp.name ?? comp.name}</h2>
          <p className="text-slate-500 text-sm mt-1">상위 지수: {index.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {savedMsg && (
            <span className={cn("text-xs font-bold px-3 py-1.5 rounded-lg",
              savedMsg.includes("완료") ? "text-green-400 bg-green-900/30" : "text-red-400 bg-red-900/30")}>
              {savedMsg}
            </span>
          )}
          <button onClick={onSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* 기본 속성 */}
        <section>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">기본 속성</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="지표명">
              <input value={editComp.name ?? ""} onChange={(e) => onEditComp({ name: e.target.value })} className="form-input" />
            </Field>
            <Field label="단위">
              <input value={editComp.unit ?? ""} onChange={(e) => onEditComp({ unit: e.target.value })} className="form-input" />
            </Field>
            <Field label="가중치 (%)">
              <input type="number" min={0} max={100}
                value={editComp.weight ?? ""}
                onChange={(e) => onEditComp({ weight: Number(e.target.value) })}
                className={cn("form-input", !weightOk && "border-yellow-600 focus:border-yellow-400")}
              />
            </Field>
            <Field label="당해연도 목표값">
              <input type="number"
                value={editComp.targetValue ?? ""}
                onChange={(e) => onEditComp({ targetValue: e.target.value ? Number(e.target.value) : null })}
                className="form-input"
              />
            </Field>
          </div>

          {/* 가중치 합 경고 */}
          {!weightOk && (
            <div className="mt-3 flex items-center gap-2 text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-800 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              현재 지수 내 구성지표 가중치 합 = <strong>{weightSum.toFixed(1)}%</strong> (100%가 되어야 합니다)
            </div>
          )}
        </section>

        {/* 수식 에디터 */}
        <section>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">수식 에디터</h3>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-2">산출식 문자열</label>
              <div className="flex gap-2">
                <input
                  value={formula}
                  onChange={(e) => setFormula(e.target.value)}
                  placeholder="예: ( A + B ) / C × 100"
                  className="flex-1 bg-slate-800 border border-slate-700 text-white text-sm font-mono px-4 py-2.5 rounded-lg focus:outline-none focus:border-purple-500"
                />
                <button onClick={onValidate} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-bold rounded-lg transition flex-shrink-0">
                  수식 검증
                </button>
              </div>
            </div>

            {validated !== null && (
              <div className={cn("flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg",
                validated ? "bg-green-900/30 border border-green-800 text-green-400" : "bg-red-900/30 border border-red-800 text-red-400")}>
                {validated
                  ? <><CheckCircle2 className="w-4 h-4" /> 검증 통과 — 변수가 모두 매핑되었습니다.</>
                  : <><AlertCircle className="w-4 h-4" /> 검증 실패 — 미매핑 변수가 있습니다.</>}
              </div>
            )}

            <div>
              <p className="text-xs text-slate-500 mb-2">추출된 변수</p>
              <div className="flex gap-2 flex-wrap">
                {Array.from(new Set(formula.match(/[A-Z]/g) ?? [])).map((v) => (
                  <span key={v} className="bg-purple-900/50 border border-purple-800 text-purple-300 text-xs font-bold px-3 py-1 rounded-full font-mono">{v}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 변수 매핑 & 권한 */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">변수 매핑 및 권한 할당</h3>
            {/* 하위지표 추가 버튼 */}
            {addingSub !== comp.id && (
              <button
                onClick={() => onStartAddSub(comp.id)}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-green-800/50 hover:bg-green-700/60 border border-green-700 text-green-300 rounded-lg transition"
              >
                <Plus className="w-3 h-3" />
                하위지표 추가
              </button>
            )}
          </div>

          <div className="space-y-3">
            {/* 기존 하위지표 */}
            {comp.subIndicators.map((sub) => {
              const cur = editSubs[sub.id] ?? {};
              const inputType = cur.inputType ?? sub.inputType;
              return (
                <div key={sub.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center text-xs font-black text-white font-mono">
                        {sub.variableKey}
                      </span>
                      <span className="text-sm font-semibold text-white">[{sub.id}] {cur.name ?? sub.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-bold px-2 py-0.5 rounded border",
                        inputType === "MANUAL" ? "bg-blue-900/30 border-blue-800 text-blue-300" : "bg-green-900/30 border-green-800 text-green-300")}>
                        {inputType === "MANUAL" ? "부서 수기 입력" : "마스터 자동 연동"}
                      </span>
                      {/* 삭제 버튼 */}
                      <button
                        onClick={() => onDeleteSub(sub.id, sub.name)}
                        title="하위지표 삭제"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-900/30 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <Field label="하위지표명">
                      <input value={cur.name ?? sub.name} onChange={(e) => onEditSub(sub.id, { name: e.target.value })} className="form-input text-xs" />
                    </Field>
                    <Field label="변수 키">
                      <select value={cur.variableKey ?? sub.variableKey} onChange={(e) => onEditSub(sub.id, { variableKey: e.target.value })} className="form-input text-xs font-mono">
                        {VARIABLE_KEYS.map((k) => <option key={k}>{k}</option>)}
                      </select>
                    </Field>
                    <Field label="입력 방식">
                      <select value={inputType} onChange={(e) => onEditSub(sub.id, { inputType: e.target.value, masterCode: null })} className="form-input text-xs">
                        <option value="MANUAL">부서 수기 입력</option>
                        <option value="MASTER_AUTO">마스터 DB 자동 연동</option>
                      </select>
                    </Field>
                    {inputType === "MANUAL" ? (
                      <Field label="담당 부서">
                        <select value={cur.deptName ?? sub.deptName} onChange={(e) => onEditSub(sub.id, { deptName: e.target.value })} className="form-input text-xs">
                          {DEPT_OPTIONS.map((d) => <option key={d}>{d}</option>)}
                        </select>
                      </Field>
                    ) : (
                      <Field label="마스터 코드">
                        <select value={cur.masterCode ?? sub.masterCode ?? ""} onChange={(e) => onEditSub(sub.id, { masterCode: e.target.value || null })} className="form-input text-xs">
                          <option value="">선택하세요</option>
                          {MASTER_CODES.map((mc) => <option key={mc.code} value={mc.code}>{mc.name} ({mc.code})</option>)}
                        </select>
                      </Field>
                    )}
                  </div>

                  <Field label="실적 입력 설명 (담당자 안내문)">
                    <textarea rows={2} value={cur.description ?? sub.description ?? ""} onChange={(e) => onEditSub(sub.id, { description: e.target.value })}
                      className="form-input text-xs resize-none" placeholder="담당자에게 보여줄 입력 기준·설명" />
                  </Field>
                </div>
              );
            })}

            {/* 새 하위지표 추가 인라인 폼 */}
            {addingSub === comp.id && (
              <div className="bg-slate-900 border-2 border-dashed border-green-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-green-400 flex items-center gap-1.5">
                    <Plus className="w-3 h-3" /> 새 하위지표 추가
                  </span>
                  <button onClick={onCancelAddSub} className="text-xs text-slate-500 hover:text-slate-300">취소</button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <Field label="하위지표명 *">
                    <input value={newSub.name ?? ""} onChange={(e) => onSetNewSub({ ...newSub, name: e.target.value })} className="form-input text-xs" placeholder="예: 융합형 교과목 개발 건수" />
                  </Field>
                  <Field label="변수 키 *">
                    <select value={newSub.variableKey ?? "A"} onChange={(e) => onSetNewSub({ ...newSub, variableKey: e.target.value })} className="form-input text-xs font-mono">
                      {VARIABLE_KEYS.map((k) => <option key={k}>{k}</option>)}
                    </select>
                  </Field>
                  <Field label="입력 방식">
                    <select value={newSub.inputType ?? "MANUAL"} onChange={(e) => onSetNewSub({ ...newSub, inputType: e.target.value })} className="form-input text-xs">
                      <option value="MANUAL">부서 수기 입력</option>
                      <option value="MASTER_AUTO">마스터 DB 자동 연동</option>
                    </select>
                  </Field>
                  {(newSub.inputType ?? "MANUAL") === "MANUAL" ? (
                    <Field label="담당 부서 *">
                      <select value={newSub.deptName ?? DEPT_OPTIONS[0]} onChange={(e) => onSetNewSub({ ...newSub, deptName: e.target.value })} className="form-input text-xs">
                        {DEPT_OPTIONS.map((d) => <option key={d}>{d}</option>)}
                      </select>
                    </Field>
                  ) : (
                    <Field label="마스터 코드">
                      <select value={newSub.masterCode ?? ""} onChange={(e) => onSetNewSub({ ...newSub, masterCode: e.target.value || null })} className="form-input text-xs">
                        <option value="">선택하세요</option>
                        {MASTER_CODES.map((mc) => <option key={mc.code} value={mc.code}>{mc.name} ({mc.code})</option>)}
                      </select>
                    </Field>
                  )}
                  <Field label="단위">
                    <input value={newSub.unit ?? ""} onChange={(e) => onSetNewSub({ ...newSub, unit: e.target.value })} className="form-input text-xs" placeholder="예: %, 건, 명" />
                  </Field>
                </div>

                <Field label="실적 입력 설명">
                  <textarea rows={2} value={newSub.description ?? ""} onChange={(e) => onSetNewSub({ ...newSub, description: e.target.value })}
                    className="form-input text-xs resize-none mb-3" placeholder="담당자에게 보여줄 입력 기준·설명" />
                </Field>

                <button
                  onClick={onAddSub}
                  disabled={saving || !newSub.name || !newSub.variableKey}
                  className="w-full py-2 text-sm font-bold bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white rounded-lg transition flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  하위지표 추가 완료
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-slate-400 font-semibold block mb-1.5">{label}</label>
      {children}
    </div>
  );
}
