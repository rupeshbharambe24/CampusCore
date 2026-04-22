import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login' as '/');

  return (
    <AppShell
      role="student"
      userName={user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Student'}
      userEmail={user.email ?? ''}
    >
      {children}
    </AppShell>
  );
}
