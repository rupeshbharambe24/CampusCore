import { type NextRequest, NextResponse } from 'next/server';

/**
 * Minimal middleware — no server-side auth checks.
 *
 * Auth is handled client-side: the login page stores a JWT in localStorage,
 * the API client attaches it to every request, and 401s redirect to /login.
 *
 * This middleware just passes requests through. It exists as a placeholder
 * for future Supabase SSR auth when we move to production.
 */
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon-.*\\.png|manifest\\.webmanifest|sw\\.js).*)'],
};
