import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Client-side localStorage is cleared by the signout button onClick.
  // This route just redirects to login.
  const origin = request.nextUrl.origin;
  return NextResponse.redirect(`${origin}/login`, { status: 302 });
}
