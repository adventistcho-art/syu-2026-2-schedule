import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { matchUserByPhonebook } from "@/lib/auth/matchUser";

type AuthUser = {
  id: string;
  name: string;
  employeeId: string;
  role: "ADMIN" | "USER";
  department: string;
};

function toAuthUser(user: {
  id: string;
  name: string;
  employeeId: string;
  role: string;
  department: string;
}): AuthUser {
  return {
    id: user.id,
    name: user.name,
    employeeId: user.employeeId,
    role: user.role as "ADMIN" | "USER",
    department: user.department,
  };
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
        /** 개발용 사번 우회 (UI 숨김) */
        employeeId: { label: "사번", type: "text" },
      },
      async authorize(credentials) {
        const employeeId = String(credentials?.employeeId || "").trim();
        if (employeeId) {
          const user = await prisma.user.findUnique({ where: { employeeId } });
          if (!user) return null;
          return toAuthUser(user);
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

        return toAuthUser(user);
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
