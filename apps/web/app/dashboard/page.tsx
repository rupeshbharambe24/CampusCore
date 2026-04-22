import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Dashboard redirector — sends users to their role-specific dashboard.
 * For now, defaults to /student since we don't have role info in Supabase user metadata yet.
 * When the backend /me endpoint is wired, this will read role and redirect accordingly.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login' as '/');
  }

  // TODO: fetch role from /me endpoint and redirect accordingly
  // For now, redirect to student dashboard as default
  redirect('/student' as '/');
}
