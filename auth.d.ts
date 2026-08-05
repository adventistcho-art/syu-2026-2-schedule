import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      employeeId: string;
      role: "ADMIN" | "USER";
      department: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    employeeId: string;
    role: "ADMIN" | "USER";
    department: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    employeeId: string;
    role: "ADMIN" | "USER";
    department: string;
  }
}
