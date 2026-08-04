import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { matchUserByPhonebook } from "@/lib/auth/matchUser";
import { resolveCanPublish } from "@/lib/auth/publishPermission";

type AuthUser = {
  id: string;
  name: string;
  employeeId: string;
  role: "ADMIN" | "USER";
  department: string;
  isTeamLeader: boolean;
  canPublishToOverall: boolean;
};

async function toAuthUser(
  user: {
    id: string;
    name: string;
    employeeId: string;
    role: string;
    department: string;
  },
  claimLeader: boolean
): Promise<AuthUser> {
  const role = user.role as "ADMIN" | "USER";
  const canPublishToOverall = await resolveCanPublish({
    role,
    department: user.department,
    isTeamLeader: claimLeader,
  });
  return {
    id: user.id,
    name: user.name,
    employeeId: user.employeeId,
    role,
    department: user.department,
    isTeamLeader: claimLeader,
    canPublishToOverall,
  };
}

function parseDutyRole(raw: unknown): boolean {
  const v = String(raw || "")
    .trim()
    .toLowerCase();
  return v === "leader" || v === "팀장" || v === "true" || v === "1";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        phoneParent: { label: "상위부서", type: "text" },
        phoneDept: { label: "실무부서", type: "text" },
        name: { label: "이름", type: "text" },
        phoneExt: { label: "내선", type: "text" },
        /** 로그인 선택: leader | member (맵 isTeamLeader와 무관) */
        dutyRole: { label: "직책", type: "text" },
        /** 개발용 사번 우회 (UI 숨김) */
        employeeId: { label: "사번", type: "text" },
      },
      async authorize(credentials) {
        const claimLeader = parseDutyRole(credentials?.dutyRole);
        const employeeId = String(credentials?.employeeId || "").trim();
        if (employeeId) {
          const user = await prisma.user.findUnique({ where: { employeeId } });
          if (!user) return null;
          return toAuthUser(user, claimLeader);
        }

        const phoneParent = String(credentials?.phoneParent || "").trim();
        const phoneDept = String(credentials?.phoneDept || "").trim();
        const name = String(credentials?.name || "").trim();
        const phoneExt = String(credentials?.phoneExt || "").trim();

        if (!phoneParent || !phoneDept || !name || !phoneExt) return null;

        const user = await matchUserByPhonebook({
          phoneParent,
          phoneDept,
          name,
          phoneExt,
        });
        if (!user) return null;

        return toAuthUser(user, claimLeader);
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      if (
        path.startsWith("/login") ||
        path.startsWith("/api/auth") ||
        path.startsWith("/api/login")
      ) {
        return true;
      }
      return !!auth?.user;
    },
    async jwt({ token, user }) {
      if (user) {
        const u = user as AuthUser;
        token.id = u.id;
        token.employeeId = u.employeeId;
        token.role = u.role;
        token.department = u.department;
        token.isTeamLeader = u.isTeamLeader;
        token.canPublishToOverall = u.canPublishToOverall;
        token.name = u.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const sUser = session.user as typeof session.user & AuthUser;
        sUser.id = token.id as string;
        sUser.employeeId = token.employeeId as string;
        sUser.role = token.role as "ADMIN" | "USER";
        sUser.department = token.department as string;
        sUser.isTeamLeader = Boolean(token.isTeamLeader);
        sUser.canPublishToOverall = Boolean(token.canPublishToOverall);
        sUser.name = (token.name as string) || session.user.name || "";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
