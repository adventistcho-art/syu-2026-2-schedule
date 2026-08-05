import { prisma } from "@/lib/prisma";

export type DeptPublishersMap = Record<string, string[]>;

export async function loadDeptPublishers(): Promise<DeptPublishersMap> {
  const rows = await prisma.deptPublisher.findMany({
    select: { department: true, employeeId: true },
  });
  const map: DeptPublishersMap = {};
  for (const r of rows) {
    if (!map[r.department]) map[r.department] = [];
    map[r.department].push(r.employeeId);
  }
  return map;
}

export async function setDeptPublisher(
  department: string,
  employeeId: string,
  enabled: boolean
) {
  const dept = department.trim();
  if (!dept) return;

  if (enabled) {
    await prisma.deptPublisher.upsert({
      where: {
        department_employeeId: { department: dept, employeeId },
      },
      create: { department: dept, employeeId },
      update: {},
    });
  } else {
    await prisma.deptPublisher.deleteMany({
      where: { department: dept, employeeId },
    });
  }
}

export async function isAssignedSomewhere(employeeId: string) {
  const count = await prisma.deptPublisher.count({ where: { employeeId } });
  return count > 0;
}
