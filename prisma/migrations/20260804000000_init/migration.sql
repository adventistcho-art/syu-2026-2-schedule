-- CreateTable
CREATE TABLE "CompositeIndex" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "targetScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompositeIndex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentIndicator" (
    "id" TEXT NOT NULL,
    "indexId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "formula" TEXT NOT NULL,
    "targetValue" DOUBLE PRECISION,
    "unit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComponentIndicator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubIndicator" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "variableKey" TEXT NOT NULL,
    "deptName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "inputType" TEXT NOT NULL,
    "masterCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubIndicator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceRecord" (
    "id" TEXT NOT NULL,
    "subIndicatorId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "targetValue" DOUBLE PRECISION,
    "actualValue" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedBy" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndexTrendData" (
    "id" TEXT NOT NULL,
    "indexId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "target" DOUBLE PRECISION,
    "actual" DOUBLE PRECISION,

    CONSTRAINT "IndexTrendData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentTrendData" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "target" DOUBLE PRECISION,
    "actual" DOUBLE PRECISION,

    CONSTRAINT "ComponentTrendData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YearSession" (
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "openedAt" TEXT NOT NULL,
    "deadline" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YearSession_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "IndexApproval" (
    "id" TEXT NOT NULL,
    "indexId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COLLECTING',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "IndexApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditLog" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "prevValue" DOUBLE PRECISION,
    "newValue" DOUBLE PRECISION,
    "editedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "year" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isTeamLeader" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "phoneParent" TEXT,
    "phoneDept" TEXT,
    "phoneExt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "dept" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "contact" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT,
    "createdByName" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceRecord_subIndicatorId_year_key" ON "PerformanceRecord"("subIndicatorId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "IndexTrendData_indexId_year_key" ON "IndexTrendData"("indexId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "ComponentTrendData_componentId_year_key" ON "ComponentTrendData"("componentId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "IndexApproval_indexId_year_key" ON "IndexApproval"("indexId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "MasterCode_code_year_key" ON "MasterCode"("code", "year");

-- CreateIndex
CREATE UNIQUE INDEX "users_employeeId_key" ON "users"("employeeId");

-- CreateIndex
CREATE INDEX "users_phoneParent_phoneDept_name_phoneExt_idx" ON "users"("phoneParent", "phoneDept", "name", "phoneExt");

-- AddForeignKey
ALTER TABLE "ComponentIndicator" ADD CONSTRAINT "ComponentIndicator_indexId_fkey" FOREIGN KEY ("indexId") REFERENCES "CompositeIndex"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubIndicator" ADD CONSTRAINT "SubIndicator_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "ComponentIndicator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceRecord" ADD CONSTRAINT "PerformanceRecord_subIndicatorId_fkey" FOREIGN KEY ("subIndicatorId") REFERENCES "SubIndicator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndexTrendData" ADD CONSTRAINT "IndexTrendData_indexId_fkey" FOREIGN KEY ("indexId") REFERENCES "CompositeIndex"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentTrendData" ADD CONSTRAINT "ComponentTrendData_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "ComponentIndicator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndexApproval" ADD CONSTRAINT "IndexApproval_indexId_fkey" FOREIGN KEY ("indexId") REFERENCES "CompositeIndex"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditLog" ADD CONSTRAINT "EditLog_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "PerformanceRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
