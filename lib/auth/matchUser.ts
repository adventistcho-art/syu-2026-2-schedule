import { prisma } from "@/lib/prisma";

export function normalizeExt(ext: string): string {
  return String(ext || "").replace(/[^0-9]/g, "");
}

export function normalizeName(name: string): string {
  return String(name || "").trim().replace(/\s+/g, " ");
}

/**
 * 실무부서(상위부서) + 이름 + 내선으로 계정 매칭.
 * 복수 히트 시 employeeId(username) 사전순 대표 1명.
 */
export async function matchUserByPhonebook(input: {
  phoneParent: string;
  phoneDept: string;
  name: string;
  phoneExt: string;
}) {
  const phoneParent = String(input.phoneParent || "").trim();
  const phoneDept = String(input.phoneDept || "").trim();
  const name = normalizeName(input.name);
  const phoneExt = normalizeExt(input.phoneExt);

  if (!phoneParent || !phoneDept || !name || !phoneExt) return null;

  const hits = await prisma.user.findMany({
    where: {
      phoneParent,
      phoneDept,
      name,
      phoneExt,
    },
    orderBy: { employeeId: "asc" },
  });

  if (hits.length === 0) return null;
  if (hits.length === 1) return hits[0];

  // 같은 이메일 그룹이면 대표 1명, 아니면 사전순 첫 계정
  const withEmail = hits.filter((h) => h.email);
  if (withEmail.length > 0) {
    const email = withEmail[0].email;
    const same = hits.filter((h) => h.email === email);
    return same.sort((a, b) => a.employeeId.localeCompare(b.employeeId))[0];
  }

  return hits[0];
}
