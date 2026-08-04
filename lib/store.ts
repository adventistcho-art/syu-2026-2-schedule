/**
 * Zustand 공유 상태 스토어 — 연도별 세션 관리
 *
 * 세션(Session) = 특정 연도의 실적 수집 주기
 *  - OPEN    : 담당자 입력 가능 (기한 내)
 *  - CLOSED  : 입력 기한 종료 or 관리자 수동 마감 → 관리자만 수정
 *  - APPROVED: 관리자 최종 공시 승인 완료
 *
 * liveIndexes: DB에서 로드한 지표 구조 (null = 아직 로드 전, REAL_INDEXES 사용)
 *  - /performance/settings 에서 구성지표·하위지표를 추가/삭제하면
 *    refreshIndexes() 를 호출해 모든 페이지에 즉시 반영됩니다.
 */
import { create } from "zustand";
import { REAL_INDEXES } from "./realData";
import type {
  CompositeIndex,
  ComponentIndicator,
  SubIndicator,
  IndexStatus,
} from "./mockData";

// ── 하위지표 제출 상태 ────────────────────────────────────────
export interface SubState {
  actualValue: number | null;
  status: "DRAFT" | "SUBMITTED";
}

// ── 수정 이력 (과거 연도 관리자 수정 시 기록) ─────────────────
export interface EditLog {
  subId: string;
  prevValue: number | null;
  newValue: number | null;
  editedAt: string;
  reason: string;
}

// ── 세션 ─────────────────────────────────────────────────────
export type SessionStatus = "OPEN" | "CLOSED" | "APPROVED";

export interface Session {
  year: number;
  status: SessionStatus;
  openedAt: string;
  deadline: string | null;
  submissions: Record<string, SubState>;
  /** 연도별 하위지표 목표값 (subId → target). DB PerformanceRecord.targetValue 기반 */
  targetValues: Record<string, number | null>;
  indexApprovals: Record<string, IndexStatus>;
  indexPublic: Record<string, boolean>;
  editLogs: EditLog[];
}

// ── DB API 응답 타입 (내부용) ─────────────────────────────────
interface DBTrendPoint { year: number; target: number | null; actual: number | null }
interface DBSubIndicator {
  id: string; componentId: string; name: string; description: string | null;
  variableKey: string; deptName: string; unit: string; inputType: string; masterCode: string | null;
}
interface DBComponent {
  id: string; indexId: string; name: string; weight: number; formula: string;
  targetValue: number | null; unit: string;
  subIndicators: DBSubIndicator[];
  trendData: DBTrendPoint[];
}
interface DBIndex {
  id: string; name: string; category: string; description: string; formula: string;
  targetScore: number; isPublic: boolean; year: number;
  components: DBComponent[];
  trendData: DBTrendPoint[];
}

/** DB 응답 → CompositeIndex 타입 변환 (REAL_INDEXES를 fallback으로 사용) */
function mapDBToCompositeIndex(db: DBIndex): CompositeIndex {
  const real = REAL_INDEXES.find((r) => r.id === db.id);
  return {
    id: db.id,
    name: db.name,
    category: db.category,
    description: db.description,
    formula: db.formula,
    score: real?.score ?? 0,
    targetScore: db.targetScore,
    isPublic: db.isPublic,
    status: real?.status ?? ("COLLECTING" as IndexStatus),
    year: db.year ?? 2024,
    trendData:
      db.trendData?.length
        ? db.trendData.map((t) => ({ year: t.year, target: t.target ?? 0, actual: t.actual ?? null }))
        : (real?.trendData ?? []),
    components: db.components.map((dbC): ComponentIndicator => {
      const realC = real?.components.find((c) => c.id === dbC.id);
      return {
        id: dbC.id,
        name: dbC.name,
        weight: dbC.weight,
        formula: dbC.formula,
        achieveRate: realC?.achieveRate ?? 0,
        targetValue: dbC.targetValue ?? realC?.targetValue ?? 0,
        actualValue: realC?.actualValue ?? null,
        unit: dbC.unit,
        trendData:
          dbC.trendData?.length
            ? dbC.trendData.map((t) => ({ year: t.year, target: t.target ?? 0, actual: t.actual ?? null }))
            : (realC?.trendData ?? []),
        subIndicators: dbC.subIndicators.map((dbS): SubIndicator => {
          const realS = realC?.subIndicators.find((s) => s.id === dbS.id);
          return {
            id: dbS.id,
            name: dbS.name,
            description: dbS.description ?? undefined,
            variableKey: dbS.variableKey,
            deptName: dbS.deptName,
            unit: dbS.unit,
            actualValue: realS?.actualValue ?? null,
            targetValue: realS?.targetValue ?? 0,
            achieveRate: realS?.achieveRate ?? null,
            status: "DRAFT",
            inputType: dbS.inputType as "MANUAL" | "MASTER_AUTO",
            masterCode: dbS.masterCode ?? undefined,
          };
        }),
      };
    }),
  };
}

// ── 스토어 타입 ───────────────────────────────────────────────
interface PerformanceStore {
  sessions: Record<number, Session>;
  activeYear: number;
  dbLoaded: Record<number, boolean>;

  /** DB에서 로드한 지표 구조. null이면 REAL_INDEXES 사용 */
  liveIndexes: CompositeIndex[] | null;

  // ── DB 동기화 ─────────────────────────────────────────────
  /** DB에서 특정 연도의 세션·실적 데이터를 불러와 스토어를 초기화 */
  hydrateFromDB: (year: number) => Promise<void>;
  /** /api/perf-sessions 목록을 불러와 모든 연도 탭·실적을 동기화 (새로고침 복원) */
  loadSessionsFromDB: () => Promise<void>;
  /** /api/perf-indexes 에서 지표 구조를 새로 로드해 liveIndexes를 갱신 */
  refreshIndexes: () => Promise<void>;

  // ── 세션 관리 (관리자) ────────────────────────────────────
  createSession: (year: number, deadline: string | null) => Promise<void>;
  openSession: (year: number) => Promise<void>;
  closeSession: (year: number) => Promise<void>;
  updateDeadline: (year: number, deadline: string | null) => Promise<void>;
  setActiveYear: (year: number) => void;

  // ── 실적 입력 (담당자) ────────────────────────────────────
  saveValue: (year: number, subId: string, value: number | null) => void;
  submitSub: (year: number, subId: string, value: number | null) => Promise<void>;
  submitMany: (year: number, entries: { subId: string; value: number | null }[]) => Promise<void>;

  // ── 관리자 액션 ───────────────────────────────────────────
  approveIndex: (year: number, indexId: string) => Promise<void>;
  togglePublic: (year: number, indexId: string) => Promise<void>;
  adminEditValue: (year: number, subId: string, value: number | null, reason: string) => Promise<void>;
  setTargetValue: (year: number, subId: string, value: number | null) => Promise<void>;

  // ── Computed helpers ──────────────────────────────────────
  isInputAllowed: (year: number) => boolean;
  getIndexStatus: (year: number, indexId: string) => IndexStatus;
  getCompletionRate: (year: number, indexId: string) => { submitted: number; total: number };
  getPendingDepts: (year: number, indexId: string) => string[];
}

// ── 세션 초기화 헬퍼 ─────────────────────────────────────────

/** 2024: realData의 실제 실적값으로 채운 APPROVED 세션 */
function buildSession2024(): Session {
  const submissions: Record<string, SubState> = {};
  const targetValues: Record<string, number | null> = {};
  REAL_INDEXES.forEach((idx) =>
    idx.components.forEach((comp) =>
      comp.subIndicators.forEach((sub) => {
        submissions[sub.id] = {
          actualValue: sub.actualValue,
          status: sub.actualValue !== null ? "SUBMITTED" : "DRAFT",
        };
        targetValues[sub.id] = sub.targetValue;
      })
    )
  );
  return {
    year: 2024,
    status: "APPROVED",
    openedAt: "2024-03-01",
    deadline: "2024-11-30",
    submissions,
    targetValues,
    indexApprovals: Object.fromEntries(REAL_INDEXES.map((i) => [i.id, "APPROVED" as IndexStatus])),
    indexPublic: Object.fromEntries(REAL_INDEXES.map((i) => [i.id, i.isPublic])),
    editLogs: [],
  };
}

/** 새 연도: 모든 실적을 DRAFT/null 로 초기화 */
function buildNewSession(year: number, deadline: string | null, indexes?: CompositeIndex[]): Session {
  const idxs = indexes ?? REAL_INDEXES;
  const submissions: Record<string, SubState> = {};
  const targetValues: Record<string, number | null> = {};
  idxs.forEach((idx) =>
    idx.components.forEach((comp) =>
      comp.subIndicators.forEach((sub) => {
        submissions[sub.id] = { actualValue: null, status: "DRAFT" };
        targetValues[sub.id] = sub.targetValue ?? null;
      })
    )
  );
  return {
    year,
    status: "OPEN",
    openedAt: new Date().toISOString().split("T")[0],
    deadline,
    submissions,
    targetValues,
    indexApprovals: Object.fromEntries(idxs.map((i) => [i.id, "COLLECTING" as IndexStatus])),
    indexPublic: Object.fromEntries(idxs.map((i) => [i.id, false])),
    editLogs: [],
  };
}

// ── DB API 헬퍼 (프로덕션 경로: /api/perf-*) ─────────────────
async function apiPatchSession(year: number, body: object) {
  await fetch(`/api/perf-sessions/${year}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(console.error);
}

async function apiPostRecord(subIndicatorId: string, year: number, actualValue: number | null, status: string) {
  await fetch("/api/perf-records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subIndicatorId, year, actualValue, status }),
  }).catch(console.error);
}

// ── 스토어 생성 ───────────────────────────────────────────────
export const usePerformanceStore = create<PerformanceStore>((set, get) => ({
  sessions: {
    2024: buildSession2024(),
  },
  activeYear: 2024,
  dbLoaded: {},
  liveIndexes: null,

  // ── DB 구조 동기화 ────────────────────────────────────────
  refreshIndexes: async () => {
    try {
      const data: DBIndex[] | null = await fetch("/api/perf-indexes")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      if (!data || !Array.isArray(data)) return;
      const mapped = data.map(mapDBToCompositeIndex);
      set({ liveIndexes: mapped });
    } catch (e) {
      console.error("refreshIndexes 실패:", e);
    }
  },

  // ── DB 세션/실적 동기화 ───────────────────────────────────
  hydrateFromDB: async (year) => {
    if (get().dbLoaded[year]) return;

    // 구조가 아직 로드되지 않았으면 먼저 로드
    if (!get().liveIndexes) {
      await get().refreshIndexes();
    }

    try {
      const [sessionsRes, recordsRes] = await Promise.all([
        fetch(`/api/perf-sessions/${year}`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/perf-records?year=${year}`).then((r) => (r.ok ? r.json() : [])),
      ]);

      // 세션 API가 실패하면 해당 연도를 탭에 추가하지 않음 (하드코딩 2024만 예외적으로 유지)
      if (!sessionsRes && !get().sessions[year]) return;

      set((s) => {
        const indexes = s.liveIndexes ?? REAL_INDEXES;
        const base = s.sessions[year] ?? buildNewSession(year, null, indexes);

        const sessionStatus = sessionsRes?.status as SessionStatus | undefined;
        const deadline = sessionsRes?.deadline ?? base.deadline;
        const openedAt = sessionsRes?.openedAt ?? base.openedAt;

        const indexApprovals: Record<string, IndexStatus> = { ...base.indexApprovals };
        const indexPublic: Record<string, boolean> = { ...base.indexPublic };
        if (sessionsRes?.approvals) {
          for (const a of sessionsRes.approvals) {
            indexApprovals[a.indexId] = a.status as IndexStatus;
            indexPublic[a.indexId] = a.isPublic;
          }
        }

        const submissions: Record<string, SubState> = { ...base.submissions };
        const targetValues: Record<string, number | null> = { ...(base.targetValues ?? {}) };
        for (const rec of (recordsRes as Array<{ subIndicatorId: string; actualValue: number | null; targetValue: number | null; status: string }>) ?? []) {
          if (rec.status === "DELETED") continue;
          submissions[rec.subIndicatorId] = {
            actualValue: rec.actualValue,
            status: rec.status === "SUBMITTED" || rec.status === "APPROVED" ? "SUBMITTED" : "DRAFT",
          };
          if (rec.targetValue !== null && rec.targetValue !== undefined) {
            targetValues[rec.subIndicatorId] = rec.targetValue;
          }
        }

        return {
          dbLoaded: { ...s.dbLoaded, [year]: true },
          sessions: {
            ...s.sessions,
            [year]: {
              ...base,
              status: sessionStatus ?? base.status,
              deadline,
              openedAt,
              submissions,
              targetValues,
              indexApprovals,
              indexPublic,
            },
          },
        };
      });
    } catch (e) {
      console.error("hydrateFromDB 실패:", e);
    }
  },

  loadSessionsFromDB: async () => {
    try {
      if (!get().liveIndexes) {
        await get().refreshIndexes();
      }

      const list: Array<{ year: number; status?: string }> | null = await fetch("/api/perf-sessions")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      if (!Array.isArray(list) || list.length === 0) {
        await get().hydrateFromDB(get().activeYear);
        return;
      }

      // 목록에 있는 연도를 모두 hydrate → 새로고침 후에도 연도 탭 유지
      for (const item of list) {
        if (typeof item.year === "number") {
          await get().hydrateFromDB(item.year);
        }
      }

      const years = list.map((s) => s.year).filter((y) => typeof y === "number").sort((a, b) => b - a);
      const current = get().activeYear;
      if (!years.includes(current)) {
        const open = list.find((s) => s.status === "OPEN");
        set({ activeYear: open?.year ?? years[0] });
      }
    } catch (e) {
      console.error("loadSessionsFromDB 실패:", e);
    }
  },

  // ── 세션 관리 ────────────────────────────────────────────
  createSession: async (year, deadline) => {
    await fetch("/api/perf-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, deadline }),
    }).catch(console.error);
    const indexes = get().liveIndexes ?? REAL_INDEXES;
    set((s) => ({
      sessions: { ...s.sessions, [year]: buildNewSession(year, deadline, indexes) },
      activeYear: year,
      dbLoaded: { ...s.dbLoaded, [year]: true },
    }));
  },

  openSession: async (year) => {
    await apiPatchSession(year, { status: "OPEN" });
    set((s) => {
      const session = s.sessions[year];
      if (!session) return s;
      return { sessions: { ...s.sessions, [year]: { ...session, status: "OPEN" } } };
    });
  },

  closeSession: async (year) => {
    await apiPatchSession(year, { status: "CLOSED" });
    set((s) => {
      const session = s.sessions[year];
      if (!session) return s;
      return { sessions: { ...s.sessions, [year]: { ...session, status: "CLOSED" } } };
    });
  },

  updateDeadline: async (year, deadline) => {
    await apiPatchSession(year, { deadline });
    set((s) => {
      const session = s.sessions[year];
      if (!session) return s;
      return { sessions: { ...s.sessions, [year]: { ...session, deadline } } };
    });
  },

  setActiveYear: (year) => set({ activeYear: year }),

  // ── 실적 입력 ─────────────────────────────────────────────
  saveValue: (year, subId, value) =>
    set((s) => {
      const session = s.sessions[year];
      if (!session) return s;
      return {
        sessions: {
          ...s.sessions,
          [year]: {
            ...session,
            submissions: {
              ...session.submissions,
              [subId]: { actualValue: value, status: "DRAFT" },
            },
          },
        },
      };
    }),

  submitSub: async (year, subId, value) => {
    set((s) => {
      const session = s.sessions[year];
      if (!session) return s;
      return {
        sessions: {
          ...s.sessions,
          [year]: {
            ...session,
            submissions: {
              ...session.submissions,
              [subId]: { actualValue: value, status: "SUBMITTED" },
            },
          },
        },
      };
    });
    await apiPostRecord(subId, year, value, "SUBMITTED");
  },

  submitMany: async (year, entries) => {
    set((s) => {
      const session = s.sessions[year];
      if (!session) return s;
      const next = { ...session.submissions };
      entries.forEach(({ subId, value }) => {
        next[subId] = { actualValue: value, status: "SUBMITTED" };
      });
      return { sessions: { ...s.sessions, [year]: { ...session, submissions: next } } };
    });
    await Promise.all(
      entries.map(({ subId, value }) => apiPostRecord(subId, year, value, "SUBMITTED"))
    );
  },

  // ── 관리자 액션 ───────────────────────────────────────────
  approveIndex: async (year, indexId) => {
    await apiPatchSession(year, { indexId, indexStatus: "APPROVED" });
    set((s) => {
      const session = s.sessions[year];
      if (!session) return s;
      return {
        sessions: {
          ...s.sessions,
          [year]: {
            ...session,
            indexApprovals: { ...session.indexApprovals, [indexId]: "APPROVED" },
          },
        },
      };
    });
  },

  togglePublic: async (year, indexId) => {
    const current = get().sessions[year]?.indexPublic[indexId] ?? false;
    await apiPatchSession(year, { indexId, isPublic: !current });
    set((s) => {
      const session = s.sessions[year];
      if (!session) return s;
      return {
        sessions: {
          ...s.sessions,
          [year]: {
            ...session,
            indexPublic: { ...session.indexPublic, [indexId]: !current },
          },
        },
      };
    });
  },

  adminEditValue: async (year, subId, value, reason) => {
    const prevValue = get().sessions[year]?.submissions[subId]?.actualValue ?? null;
    const log: EditLog = {
      subId,
      prevValue,
      newValue: value,
      editedAt: new Date().toISOString(),
      reason,
    };
    set((s) => {
      const session = s.sessions[year];
      if (!session) return s;
      return {
        sessions: {
          ...s.sessions,
          [year]: {
            ...session,
            submissions: {
              ...session.submissions,
              [subId]: { actualValue: value, status: "SUBMITTED" },
            },
            editLogs: [...session.editLogs, log],
          },
        },
      };
    });
    await apiPostRecord(subId, year, value, "SUBMITTED");
  },

  setTargetValue: async (year, subId, value) => {
    await fetch("/api/perf-records", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subIndicatorId: subId, year, targetValue: value }),
    }).catch(console.error);
    set((s) => {
      const session = s.sessions[year];
      if (!session) return s;
      return {
        sessions: {
          ...s.sessions,
          [year]: {
            ...session,
            targetValues: { ...session.targetValues, [subId]: value },
          },
        },
      };
    });
  },

  // ── Computed ─────────────────────────────────────────────
  isInputAllowed: (year) => {
    const session = get().sessions[year];
    if (!session || session.status !== "OPEN") return false;
    if (!session.deadline) return true;
    return new Date() <= new Date(session.deadline + "T23:59:59");
  },

  getIndexStatus: (year, indexId) => {
    const session = get().sessions[year];
    if (!session) return "COLLECTING";
    const approval = session.indexApprovals[indexId];
    if (approval === "APPROVED") return "APPROVED";

    const indexes = get().liveIndexes ?? REAL_INDEXES;
    const idx = indexes.find((i) => i.id === indexId);
    if (!idx) return "COLLECTING";

    const allSubs = idx.components.flatMap((c) => c.subIndicators);
    if (allSubs.length === 0) return "COLLECTING";

    const allSubmitted = allSubs.every(
      (s) => session.submissions[s.id]?.status === "SUBMITTED"
    );
    return allSubmitted ? "PENDING" : "COLLECTING";
  },

  getCompletionRate: (year, indexId) => {
    const session = get().sessions[year];
    if (!session) return { submitted: 0, total: 0 };

    const indexes = get().liveIndexes ?? REAL_INDEXES;
    const idx = indexes.find((i) => i.id === indexId);
    if (!idx) return { submitted: 0, total: 0 };

    let submitted = 0;
    let total = 0;
    idx.components.forEach((comp) => {
      comp.subIndicators.forEach((sub) => {
        total += 1;
        if (session.submissions[sub.id]?.status === "SUBMITTED") submitted += 1;
      });
    });
    return { submitted, total };
  },

  getPendingDepts: (year, indexId) => {
    const session = get().sessions[year];
    if (!session) return [];

    const indexes = get().liveIndexes ?? REAL_INDEXES;
    const idx = indexes.find((i) => i.id === indexId);
    if (!idx) return [];

    const depts = new Set<string>();
    idx.components.forEach((comp) =>
      comp.subIndicators.forEach((sub) => {
        if (session.submissions[sub.id]?.status !== "SUBMITTED") {
          depts.add(sub.deptName);
        }
      })
    );
    return Array.from(depts);
  },
}));
