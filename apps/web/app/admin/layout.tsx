import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login' as '/');

  return (
    <AppShell
      role="admin"
      userName={user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Admin'}
      userEmail={user.email ?? ''}
    >
      {children}
    </AppShell>
  );
}
