import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      employeeId: string;
      role: "ADMIN" | "USER";
      department: string;
      isTeamLeader: boolean;
      canPublishToOverall: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    employeeId: string;
    role: "ADMIN" | "USER";
    department: string;
    isTeamLeader: boolean;
    canPublishToOverall: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    employeeId: string;
    role: "ADMIN" | "USER";
    department: string;
    isTeamLeader: boolean;
    canPublishToOverall: boolean;
  }
}
