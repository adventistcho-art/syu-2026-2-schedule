-- CreateTable
CREATE TABLE "dept_publishers" (
    "id" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dept_publishers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dept_publishers_department_idx" ON "dept_publishers"("department");

-- CreateIndex
CREATE UNIQUE INDEX "dept_publishers_department_employeeId_key" ON "dept_publishers"("department", "employeeId");
