/**
 * 삼육대학교 성과관리종합지수 — DB 시드 스크립트
 * realData.ts의 마스터 데이터를 SQLite DB에 초기 적재합니다.
 * + 2026-2학기 공식 학사주요일정 / 테스트 사용자
 * + cho.syu.my 계정 맵 스냅샷 (실무부서·이름·내선 로그인)
 *
 * 실행: npx tsx prisma/seed.ts
 */
import { readFileSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { REAL_INDEXES } from "../lib/realData";
import {
  OFFICIAL_ACADEMIC_EVENTS,
  DUMMY_DEPT_EVENTS,
  SEED_USERS,
} from "../lib/schedule/academicSeed";

const prisma = new PrismaClient();

type MapSnapshotAccount = {
  username: string;
  name: string;
  email?: string | null;
  primaryDept?: string | null;
  phoneParent: string;
  phoneDept: string;
  phoneExt: string;
  isTeamLeader: boolean;
  role: string;
};

function loadMapSnapshot(): MapSnapshotAccount[] {
  const file = path.join(
    process.cwd(),
    "data",
    "account-access-map.snapshot.json"
  );
  const raw = JSON.parse(readFileSync(file, "utf8")) as {
    accounts: MapSnapshotAccount[];
  };
  return raw.accounts ?? [];
}

// 마스터 자동 연동 코드 초기값 (2024 기준)
const MASTER_CODE_DATA = [
  { code: "ENROLLED_STUDENTS_UG", name: "학부 재학생 수", value: 10027, year: 2024 },
  { code: "ENROLLED_STUDENTS",    name: "재학생 수(전체)",  value: 10027, year: 2024 },
  { code: "ENROLLED_STUDENTS_AVG",name: "재학생 수(1·2학기 평균)", value: 5014, year: 2024 },
  { code: "TOTAL_COURSES",        name: "전체 개설 교과목 수", value: 2899, year: 2024 },
  { code: "MAJOR_COURSES",        name: "전공 개설 교과목 수", value: 2448, year: 2024 },
  { code: "LIBERAL_ARTS_COURSES", name: "교양 개설 교과목 수", value: 206, year: 2024 },
  { code: "FULL_TIME_FACULTY",    name: "전임교원 수", value: 209, year: 2024 },
  { code: "GRADUATES",            name: "졸업생 수", value: 1247, year: 2024 },
  { code: "BUDGET_TOTAL",         name: "예산 자금지출 총계", value: 98471291000, year: 2024 },
  { code: "FACULTY_STAFF_TOTAL",  name: "교원·직원 수", value: 469, year: 2024 },
  // 2025 목표용 마스터 코드 (임시)
  { code: "ENROLLED_STUDENTS_UG", name: "학부 재학생 수", value: 10329, year: 2025 },
  { code: "ENROLLED_STUDENTS",    name: "재학생 수(전체)",  value: 10329, year: 2025 },
  { code: "ENROLLED_STUDENTS_AVG",name: "재학생 수(1·2학기 평균)", value: 5165, year: 2025 },
  { code: "TOTAL_COURSES",        name: "전체 개설 교과목 수", value: 2056, year: 2025 },
  { code: "MAJOR_COURSES",        name: "전공 개설 교과목 수", value: 1382, year: 2025 },
  { code: "LIBERAL_ARTS_COURSES", name: "교양 개설 교과목 수", value: 200, year: 2025 },
  { code: "FULL_TIME_FACULTY",    name: "전임교원 수", value: 210, year: 2025 },
  { code: "GRADUATES",            name: "졸업생 수", value: 1322, year: 2025 },
];

async function main() {
  console.log("🌱 DB 시드 시작...\n");

  // 1. 마스터 코드 적재
  console.log("📦 마스터 코드 적재 중...");
  for (const mc of MASTER_CODE_DATA) {
    await prisma.masterCode.upsert({
      where: { code_year: { code: mc.code, year: mc.year } },
      update: { value: mc.value, name: mc.name },
      create: mc,
    });
  }
  console.log(`  ✅ ${MASTER_CODE_DATA.length}개 마스터 코드 완료\n`);

  // 2. 종합지수 / 구성지표 / 하위지표 마스터 적재
  console.log("📊 지표 마스터 적재 중...");
  for (const idx of REAL_INDEXES) {
    // 종합지수
    await prisma.compositeIndex.upsert({
      where: { id: idx.id },
      update: {
        name: idx.name,
        category: idx.category,
        description: idx.description,
        formula: idx.formula,
        targetScore: idx.targetScore,
        isPublic: idx.isPublic,
        year: idx.year,
      },
      create: {
        id: idx.id,
        name: idx.name,
        category: idx.category,
        description: idx.description,
        formula: idx.formula,
        targetScore: idx.targetScore,
        isPublic: idx.isPublic,
        year: idx.year,
      },
    });

    // 종합지수 추이 데이터
    for (const td of idx.trendData) {
      await prisma.indexTrendData.upsert({
        where: { indexId_year: { indexId: idx.id, year: td.year } },
        update: { target: td.target ?? null, actual: td.actual ?? null },
        create: { indexId: idx.id, year: td.year, target: td.target ?? null, actual: td.actual ?? null },
      });
    }

    for (const comp of idx.components) {
      // 구성지표
      await prisma.componentIndicator.upsert({
        where: { id: comp.id },
        update: {
          indexId: idx.id,
          name: comp.name,
          weight: comp.weight,
          formula: comp.formula,
          targetValue: comp.targetValue ?? null,
          unit: comp.unit,
        },
        create: {
          id: comp.id,
          indexId: idx.id,
          name: comp.name,
          weight: comp.weight,
          formula: comp.formula,
          targetValue: comp.targetValue ?? null,
          unit: comp.unit,
        },
      });

      // 구성지표 추이 데이터
      for (const td of comp.trendData) {
        await prisma.componentTrendData.upsert({
          where: { componentId_year: { componentId: comp.id, year: td.year } },
          update: { target: td.target ?? null, actual: td.actual ?? null },
          create: { componentId: comp.id, year: td.year, target: td.target ?? null, actual: td.actual ?? null },
        });
      }

      for (const sub of comp.subIndicators) {
        // 하위지표
        await prisma.subIndicator.upsert({
          where: { id: sub.id },
          update: {
            componentId: comp.id,
            name: sub.name,
            description: sub.description ?? null,
            variableKey: sub.variableKey,
            deptName: sub.deptName,
            unit: sub.unit,
            inputType: sub.inputType,
            masterCode: sub.masterCode ?? null,
          },
          create: {
            id: sub.id,
            componentId: comp.id,
            name: sub.name,
            description: sub.description ?? null,
            variableKey: sub.variableKey,
            deptName: sub.deptName,
            unit: sub.unit,
            inputType: sub.inputType,
            masterCode: sub.masterCode ?? null,
          },
        });

        // 2024 실적 기록
        if (sub.actualValue !== null || sub.targetValue !== null) {
          await prisma.performanceRecord.upsert({
            where: { subIndicatorId_year: { subIndicatorId: sub.id, year: 2024 } },
            update: {
              targetValue: sub.targetValue ?? null,
              actualValue: sub.actualValue ?? null,
              status: sub.actualValue !== null ? "APPROVED" : "DRAFT",
            },
            create: {
              subIndicatorId: sub.id,
              year: 2024,
              targetValue: sub.targetValue ?? null,
              actualValue: sub.actualValue ?? null,
              status: sub.actualValue !== null ? "APPROVED" : "DRAFT",
              submittedAt: sub.actualValue !== null ? new Date("2024-11-30") : null,
            },
          });
        }
      }
    }

    // 연도별 승인 상태 (2024: APPROVED, 2025: COLLECTING)
    for (const year of [2024, 2025]) {
      await prisma.indexApproval.upsert({
        where: { indexId_year: { indexId: idx.id, year } },
        update: {},
        create: {
          indexId: idx.id,
          year,
          status: year === 2024 ? "APPROVED" : "COLLECTING",
          isPublic: year === 2024 ? idx.isPublic : false,
        },
      });
    }

    process.stdout.write(`  ✅ ${idx.id} ${idx.name}\n`);
  }

  // 3. 연도별 세션 초기화
  console.log("\n📅 연도별 세션 초기화 중...");
  for (const { year, status, deadline } of [
    { year: 2024, status: "APPROVED", deadline: "2024-11-30" },
    { year: 2025, status: "OPEN",     deadline: "2026-12-31" },
  ]) {
    await prisma.yearSession.upsert({
      where: { year },
      update: { status, deadline },
      create: { year, status, deadline, openedAt: new Date().toISOString() },
    });
  }
  console.log("  ✅ 세션 초기화 완료\n");

  // 4. 사용자 — 로컬 일정 테스트 + 계정 맵 스냅샷
  console.log("👤 사용자 적재 중...");
  for (const u of SEED_USERS) {
    await prisma.user.upsert({
      where: { employeeId: u.employeeId },
      update: {
        name: u.name,
        department: u.department,
        role: u.role,
        isTeamLeader: u.isTeamLeader,
        phoneParent: u.phoneParent,
        phoneDept: u.phoneDept,
        phoneExt: u.phoneExt,
      },
      create: {
        employeeId: u.employeeId,
        name: u.name,
        department: u.department,
        role: u.role,
        isTeamLeader: u.isTeamLeader,
        phoneParent: u.phoneParent,
        phoneDept: u.phoneDept,
        phoneExt: u.phoneExt,
      },
    });
  }
  console.log(`  ✅ 로컬 테스트 사용자 ${SEED_USERS.length}명`);

  const mapAccounts = loadMapSnapshot();
  let mapCount = 0;
  for (const a of mapAccounts) {
    const department = (a.primaryDept || a.phoneDept || "").trim();
    if (!department) continue;
    await prisma.user.upsert({
      where: { employeeId: a.username },
      update: {
        name: a.name,
        department,
        role: a.role === "ADMIN" ? "ADMIN" : "USER",
        isTeamLeader: a.isTeamLeader,
        email: a.email ?? null,
        phoneParent: a.phoneParent,
        phoneDept: a.phoneDept,
        phoneExt: a.phoneExt,
      },
      create: {
        employeeId: a.username,
        name: a.name,
        department,
        role: a.role === "ADMIN" ? "ADMIN" : "USER",
        isTeamLeader: a.isTeamLeader,
        email: a.email ?? null,
        phoneParent: a.phoneParent,
        phoneDept: a.phoneDept,
        phoneExt: a.phoneExt,
      },
    });
    mapCount += 1;
  }
  console.log(`  ✅ 계정 맵 스냅샷 ${mapCount}명 완료\n`);

  // 5. 공식 학사주요일정 (2026.09~2027.02)
  console.log("📆 학사주요일정 시드 중...");
  await prisma.event.deleteMany();
  await prisma.event.createMany({
    data: OFFICIAL_ACADEMIC_EVENTS.map((e) => ({
      title: e.title,
      category: e.category,
      dept: e.dept,
      startDate: new Date(`${e.startDate}T00:00:00.000Z`),
      endDate: new Date(`${e.endDate}T23:59:59.999Z`),
      location: e.location ?? null,
      contact: e.contact ?? null,
      description: e.description ?? null,
      status: "PUBLISHED",
      createdById: null,
      createdByName: null,
      publishedAt: new Date(),
    })),
  });
  console.log(`  ✅ ${OFFICIAL_ACADEMIC_EVENTS.length}건 공식 일정 완료\n`);

  // 6. 부서 더미 일정 (초안 + 제출분)
  console.log("🧪 부서 더미 일정 적재 중...");
  await prisma.event.createMany({
    data: DUMMY_DEPT_EVENTS.map((e) => ({
      title: e.title,
      category: e.category,
      dept: e.dept,
      startDate: new Date(`${e.startDate}T00:00:00.000Z`),
      endDate: new Date(`${e.endDate}T23:59:59.999Z`),
      location: e.location ?? null,
      contact: e.contact ?? null,
      description: e.description ?? null,
      status: e.status,
      createdById: e.createdById,
      createdByName: e.createdByName,
      publishedAt: e.status === "PUBLISHED" ? new Date() : null,
    })),
  });
  const draftCount = DUMMY_DEPT_EVENTS.filter((e) => e.status === "DRAFT").length;
  const publishedDummy = DUMMY_DEPT_EVENTS.filter(
    (e) => e.status === "PUBLISHED"
  ).length;
  console.log(
    `  ✅ 더미 ${DUMMY_DEPT_EVENTS.length}건 (초안 ${draftCount} / 제출 ${publishedDummy})\n`
  );

  console.log("🎉 시드 완료!");
  const counts = {
    compositeIndexes: await prisma.compositeIndex.count(),
    componentIndicators: await prisma.componentIndicator.count(),
    subIndicators: await prisma.subIndicator.count(),
    performanceRecords: await prisma.performanceRecord.count(),
    masterCodes: await prisma.masterCode.count(),
    users: await prisma.user.count(),
    events: await prisma.event.count(),
    drafts: await prisma.event.count({ where: { status: "DRAFT" } }),
    published: await prisma.event.count({ where: { status: "PUBLISHED" } }),
  };
  console.table(counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
