import { ThemeToggle } from '@/components/theme-toggle';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary" aria-hidden />
          <span className="text-lg font-semibold tracking-tight">CampusCore</span>
        </div>
        <ThemeToggle />
      </header>

      <section className="container flex flex-1 flex-col items-center justify-center gap-6 py-16 text-center">
        <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          Phase 0 · Foundations
        </span>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          The college runs on CampusCore.
        </h1>
        <p className="max-w-xl text-balance text-muted-foreground">
          Attendance, timetable, and activity tracking — for every student and faculty member, in
          one place. Replacing paper registers and printed Excel sheets.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <a
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Sign in
          </a>
          <a
            href="http://localhost:8000/api/v1/docs"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            API docs
          </a>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
        CampusCore v0.1.0 · built for the college
      </footer>
    </main>
  );
}
