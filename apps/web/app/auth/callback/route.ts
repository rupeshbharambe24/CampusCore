import { createClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Handles the OAuth/magic-link/password-reset callback from Supabase.
 * Exchanges the auth code for a session, then redirects.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If no code or exchange failed, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
