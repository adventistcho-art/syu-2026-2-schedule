import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ComponentIndicator } from "./mockData";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 소수점 처리 (기본 2자리, 덮어쓰기 가능) */
export function round(value: number, places = 2): number {
  const factor = Math.pow(10, places);
  return Math.round(value * factor) / factor;
}

/** Cap 보정 — 달성률 100% 초과 시 상한 적용 */
export function applyCap(achieveRate: number, capValue: number | null): number {
  if (capValue === null) return achieveRate;
  return Math.min(achieveRate, capValue);
}

/** 가중치 환산 점수 계산 */
export function calcWeightedScore(
  achieveRate: number,   // 0~100+ (%)
  weight: number,        // 0~100 (%)
  capValue: number | null = 100
): number {
  const capped = applyCap(achieveRate, capValue ?? 100);
  return round((capped / 100) * weight, 2);
}

/** 천 단위 콤마 포맷 */
export function formatNumber(val: number | string): string {
  return Number(val).toLocaleString("ko-KR");
}

/** 달성 상태 텍스트 */
export function achieveStatusLabel(rate: number): {
  label: string;
  color: string;
} {
  if (rate >= 110) return { label: "초과 달성", color: "text-emerald-400" };
  if (rate >= 100) return { label: "목표 달성", color: "text-green-400" };
  if (rate >= 80)  return { label: "진행 중", color: "text-yellow-400" };
  return { label: "미달", color: "text-red-400" };
}

// ── 동적 산식 계산 ─────────────────────────────────────────────

/**
 * 산식 문자열(A/B×100 등)에 변수값을 대입해 계산합니다.
 * 변수가 null이거나 계산 불가 시 null 반환.
 */
export function evalFormula(
  formula: string,
  varMap: Record<string, number>
): number | null {
  let expr = formula.replace(/×/g, "*").replace(/÷/g, "/");

  // 단독 대문자 변수(A~Z)를 값으로 치환
  for (const [key, value] of Object.entries(varMap)) {
    expr = expr.replace(new RegExp(`\\b${key}\\b`, "g"), String(value));
  }

  // 치환 후 한글이 남아있으면 복잡한 산식 → null
  if (/[가-힣]/.test(expr)) return null;

  try {
    // eslint-disable-next-line no-new-func
    const result = new Function(`"use strict"; return (${expr})`)() as number;
    return isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

/**
 * 구성지표 동적 실적·달성률 계산.
 * - 하위지표 제출값으로 산식 평가 → dynamicActual
 * - dynamicAchieveRate = min(dynamicActual / targetValue × 100, 150)
 * - 제출값 누락 또는 계산 불가 시 null
 */
export function calcDynamicComp(
  comp: ComponentIndicator,
  subs: Record<string, { actualValue: number | null }>
): { dynamicActual: number | null; dynamicAchieveRate: number | null } {
  // 하위지표 없는 경우 hardcoded 값 그대로 반환
  if (comp.subIndicators.length === 0) {
    return { dynamicActual: comp.actualValue, dynamicAchieveRate: comp.achieveRate };
  }

  // 변수 맵 구성: 하나라도 null이면 계산 불가
  const varMap: Record<string, number> = {};
  for (const sub of comp.subIndicators) {
    const val = subs[sub.id]?.actualValue;
    if (val === null || val === undefined) {
      return { dynamicActual: null, dynamicAchieveRate: null };
    }
    varMap[sub.variableKey] = val;
  }

  // 산식 평가
  let dynamicActual: number | null = evalFormula(comp.formula, varMap);

  // 한글 포함 산식 폴백: Σ실적 / Σ목표 × 100
  if (dynamicActual === null && /[가-힣]/.test(comp.formula)) {
    const sumA = comp.subIndicators.reduce((s, sub) => s + (varMap[sub.variableKey] ?? 0), 0);
    const sumT = comp.subIndicators.reduce((s, sub) => s + sub.targetValue, 0);
    if (sumT > 0) dynamicActual = (sumA / sumT) * 100;
  }

  if (dynamicActual === null) return { dynamicActual: null, dynamicAchieveRate: null };

  const dynamicAchieveRate =
    comp.targetValue !== 0
      ? Math.min((dynamicActual / comp.targetValue) * 100, 150)
      : 0;

  return { dynamicActual, dynamicAchieveRate };
}
