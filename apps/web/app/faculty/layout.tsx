'use client';

import { AppShell } from '@/components/app-shell';
import { useMe } from '@/lib/hooks';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  const { data, isLoading, error } = useMe();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (error || !data)) {
      router.replace('/login' as '/');
    }
  }, [data, isLoading, error, router]);

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppShell
      role={data.user.role}
      userName={data.user.full_name}
      userEmail={data.user.email}
    >
      {children}
    </AppShell>
  );
}
