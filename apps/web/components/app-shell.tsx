'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { PageTransition } from '@/components/motion';
import { cn } from '@/lib/utils';

export function AppShell({
  children,
  role,
  userName,
  userEmail,
}: {
  children: React.ReactNode;
  role: string;
  userName: string;
  userEmail: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar role={role} userName={userName} userEmail={userEmail} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 h-full w-64">
            <Sidebar role={role} userName={userName} userEmail={userEmail} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 items-center gap-3 border-b border-border px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="text-lg font-bold tracking-tight text-primary">CampusCore</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
