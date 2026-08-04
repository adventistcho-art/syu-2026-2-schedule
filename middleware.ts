export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    "/schedule/:path*",
    "/performance/:path*",
    "/((?!api|_next/static|_next/image|favicon.ico|login).*)",
  ],
};
