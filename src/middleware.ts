import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  console.log("=== MIDDLEWARE ===");
  console.log("URL:", request.url);
  console.log("Method:", request.method);
  console.log("Path:", request.nextUrl.pathname);
  console.log("Headers:", JSON.stringify(Object.fromEntries(request.headers)));
  console.log("==================");

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
