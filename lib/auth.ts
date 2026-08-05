import { auth } from "@/auth";

export type AppUser = {
  id: string;
  name: string;
  employeeId: string;
  role: "ADMIN" | "USER";
  department: string;
};

export async function getSessionUser(): Promise<AppUser | null> {
  const session = await auth();
  if (!session?.user) return null;

  const user = session.user as {
    id?: string;
    name?: string | null;
    employeeId?: string;
    role?: "ADMIN" | "USER";
    department?: string;
  };

  if (!user.id || !user.employeeId || !user.department || !user.role) {
    return null;
  }

  return {
    id: user.id,
    name: user.name ?? "",
    employeeId: user.employeeId,
    role: user.role,
    department: user.department,
  };
}

export async function isAdmin() {
  const user = await getSessionUser();
  return user?.role === "ADMIN";
}

export async function belongsToDepartment(department: string) {
  const user = await getSessionUser();
  return user?.department === department;
}
