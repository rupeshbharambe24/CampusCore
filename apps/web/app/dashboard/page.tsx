import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ThemeToggle } from '@/components/theme-toggle';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login' as '/');
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary" aria-hidden />
          <span className="text-lg font-semibold tracking-tight">CampusCore</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      <section className="container flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
        <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          Phase 1 · Auth working
        </span>
        <h1 className="text-3xl font-bold tracking-tight">Welcome to CampusCore</h1>
        <p className="text-muted-foreground">
          You are signed in as <strong>{user.email}</strong>
        </p>
        <p className="text-sm text-muted-foreground">
          Dashboard features (attendance, timetable) are coming in Phase 2+.
        </p>
      </section>
    </main>
  );
}

function SignOutButton() {
  return (
    <form action="/auth/signout" method="POST">
      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        Sign out
      </button>
    </form>
  );
}
