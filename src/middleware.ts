import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const accessCode = process.env.APP_ACCESS_CODE?.trim();

  // A deployed dashboard must not silently become public when its secret is missing.
  if (!accessCode && process.env.VERCEL) {
    return new NextResponse("APP_ACCESS_CODE is required for deployed use.", { status: 503 });
  }
  if (!accessCode) return NextResponse.next();

  const expected = `Basic ${btoa(`leadfinder:${accessCode}`)}`;
  if (req.headers.get("authorization") !== expected) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="LeadFinder"' },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
