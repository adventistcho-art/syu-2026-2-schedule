// 개발/데모용 목업 데이터 — 실제 배포 시 DB API로 교체
export type IndexStatus = "COLLECTING" | "PENDING" | "APPROVED";

export interface SubIndicator {
  id: string;
  name: string;
  /** 담당자가 실적을 입력할 때 참고하는 세부 기준 설명 */
  description?: string;
  variableKey: string;
  deptName: string;
  actualValue: number | null;
  targetValue: number;
  unit: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED";
  inputType: "MANUAL" | "MASTER_AUTO";
  masterCode?: string;
  achieveRate?: number | null;
}

export interface ComponentIndicator {
  id: string;
  name: string;
  weight: number;           // %
  formula: string;
  achieveRate: number;      // %
  targetValue: number;
  actualValue: number | null;
  unit: string;
  subIndicators: SubIndicator[];
  trendData: { year: number; target: number; actual: number | null }[];
}

export interface CompositeIndex {
  id: string;
  name: string;
  category: string;
  description: string;
  formula: string;           // 표시용 산출식 문자열
  score: number;             // 100점 만점 환산
  targetScore: number;
  isPublic: boolean;
  status: IndexStatus;
  year: number;
  components: ComponentIndicator[];
  trendData: { year: number; target: number; actual: number | null }[];
}

// ──────────────────────────────────────────────────────────────
// 실제 데이터는 lib/realData.ts 에서 관리됩니다.
// 하위 호환을 위해 MOCK_INDEXES 는 실제 데이터를 re-export 합니다.
// ──────────────────────────────────────────────────────────────
export { REAL_INDEXES as MOCK_INDEXES } from "./realData";

// ── 아래는 레거시 목업 (참고용, 실제 사용 안 함) ──────────────
const _LEGACY_MOCK_INDEXES: CompositeIndex[] = [
  {
    id: "10000",
    name: "MVP Edu-Framework 혁신 지수",
    category: "Ⅰ. 미래교육을 선도하는 MVP 교육혁신",
    description:
      "미래형 학사제도 참여율, 융합 교과목 개발 등 5개의 하위 구성지표를 20%씩 가중 합산하여 산출하는 종합 지수입니다.",
    formula: "A×0.2 + B×0.2 + C×0.2 + D×0.2 + E×0.2",
    score: 78.0,
    targetScore: 90.0,
    isPublic: true,
    status: "APPROVED",
    year: 2025,
    trendData: [
      { year: 2022, target: 70, actual: 62.5 },
      { year: 2023, target: 75, actual: 71.0 },
      { year: 2024, target: 82, actual: 80.5 },
      { year: 2025, target: 90, actual: 78.0 },
      { year: 2026, target: 92, actual: null },
      { year: 2027, target: 95, actual: null },
    ],
    components: [
      {
        id: "10100",
        name: "미래형 학사제도 참여학생 비율",
        weight: 20,
        formula: "(A + B) / C × 100",
        achieveRate: 125.0,
        targetValue: 20,
        actualValue: 25.0,
        unit: "%",
        subIndicators: [],
        trendData: [
          { year: 2022, target: 10, actual: 8.2 },
          { year: 2023, target: 15, actual: 13.0 },
          { year: 2024, target: 18, actual: 19.5 },
          { year: 2025, target: 20, actual: 25.0 },
          { year: 2026, target: 22, actual: null },
          { year: 2027, target: 25, actual: null },
        ],
      },
      {
        id: "10200",
        name: "융합형 교과목 개발 건수",
        weight: 20,
        formula: "(A + B) / C",
        achieveRate: 93.3,
        targetValue: 30,
        actualValue: 28,
        unit: "건",
        subIndicators: [
          {
            id: "10201",
            name: "융합형 교과목(전공) 개발 건수",
            variableKey: "A",
            deptName: "학사지원팀",
            actualValue: 16,
            targetValue: 18,
            unit: "건",
            status: "SUBMITTED",
            inputType: "MANUAL",
          },
          {
            id: "10202",
            name: "융합형 교과목(교양) 개발 건수",
            variableKey: "B",
            deptName: "교양교육원",
            actualValue: null,
            targetValue: 12,
            unit: "건",
            status: "DRAFT",
            inputType: "MANUAL",
          },
          {
            id: "10203",
            name: "전체 교과목 수 (분모)",
            variableKey: "C",
            deptName: "마스터 자동 연동",
            actualValue: 892,
            targetValue: 892,
            unit: "개",
            status: "SUBMITTED",
            inputType: "MASTER_AUTO",
            masterCode: "TOTAL_COURSES",
          },
        ],
        trendData: [
          { year: 2022, target: 15, actual: 12 },
          { year: 2023, target: 20, actual: 19 },
          { year: 2024, target: 25, actual: 27 },
          { year: 2025, target: 30, actual: 28 },
          { year: 2026, target: 35, actual: null },
          { year: 2027, target: 40, actual: null },
        ],
      },
      {
        id: "10300",
        name: "교원 교수법 역량강화 참여인원",
        weight: 20,
        formula: "A / B × 100",
        achieveRate: 88.5,
        targetValue: 200,
        actualValue: 177,
        unit: "명",
        subIndicators: [],
        trendData: [
          { year: 2022, target: 120, actual: 95 },
          { year: 2023, target: 150, actual: 142 },
          { year: 2024, target: 175, actual: 180 },
          { year: 2025, target: 200, actual: 177 },
          { year: 2026, target: 210, actual: null },
          { year: 2027, target: 220, actual: null },
        ],
      },
      {
        id: "10400",
        name: "산학협력 프로젝트 수행 건수",
        weight: 20,
        formula: "A",
        achieveRate: 100.0,
        targetValue: 45,
        actualValue: 45,
        unit: "건",
        subIndicators: [],
        trendData: [
          { year: 2022, target: 25, actual: 24 },
          { year: 2023, target: 32, actual: 35 },
          { year: 2024, target: 40, actual: 42 },
          { year: 2025, target: 45, actual: 45 },
          { year: 2026, target: 50, actual: null },
          { year: 2027, target: 55, actual: null },
        ],
      },
      {
        id: "10500",
        name: "온라인 강좌 개발 건수",
        weight: 20,
        formula: "A",
        achieveRate: 60.0,
        targetValue: 50,
        actualValue: 30,
        unit: "건",
        subIndicators: [],
        trendData: [
          { year: 2022, target: 20, actual: 18 },
          { year: 2023, target: 30, actual: 28 },
          { year: 2024, target: 40, actual: 38 },
          { year: 2025, target: 50, actual: 30 },
          { year: 2026, target: 55, actual: null },
          { year: 2027, target: 60, actual: null },
        ],
      },
    ],
  },
  {
    id: "20000",
    name: "MVP 교과교육 혁신 지수",
    category: "Ⅱ. 미래를 여는 MVP 교과교육 혁신",
    description: "교육과정 개편 실적, 학습성과 관리 등 주요 지표를 종합한 지수입니다.",
    formula: "A×0.25 + B×0.25 + C×0.25 + D×0.25",
    score: 82.5,
    targetScore: 88.0,
    isPublic: true,
    status: "APPROVED",
    year: 2025,
    trendData: [
      { year: 2022, target: 68, actual: 60 },
      { year: 2023, target: 74, actual: 72 },
      { year: 2024, target: 80, actual: 79 },
      { year: 2025, target: 88, actual: 82.5 },
      { year: 2026, target: 90, actual: null },
      { year: 2027, target: 93, actual: null },
    ],
    components: [
      {
        id: "20100",
        name: "교육과정 개편 반영률",
        weight: 25,
        formula: "A / B × 100",
        achieveRate: 95.2,
        targetValue: 100,
        actualValue: 95.2,
        unit: "%",
        subIndicators: [],
        trendData: [
          { year: 2022, target: 70, actual: 65 },
          { year: 2023, target: 80, actual: 78 },
          { year: 2024, target: 90, actual: 91 },
          { year: 2025, target: 100, actual: 95.2 },
          { year: 2026, target: 100, actual: null },
          { year: 2027, target: 100, actual: null },
        ],
      },
    ],
  },
  {
    id: "30000",
    name: "연구역량 강화 지수",
    category: "Ⅲ. 연구역량 강화",
    description: "연구비 수주, 논문 실적 등을 종합한 지수입니다.",
    formula: "A×0.3 + B×0.3 + C×0.4",
    score: 65.0,
    targetScore: 80.0,
    isPublic: false,  // 비공개 처리됨
    status: "COLLECTING",
    year: 2025,
    trendData: [],
    components: [],
  },
];

// _LEGACY_MOCK_INDEXES is kept for reference only — not exported
void _LEGACY_MOCK_INDEXES;
