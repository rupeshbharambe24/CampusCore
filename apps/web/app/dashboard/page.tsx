'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMe } from '@/lib/hooks';
import { Loader2 } from 'lucide-react';

/**
 * Dashboard redirector — fetches /me to determine role, then redirects.
 * Also handles must_change_password check.
 */
export default function DashboardPage() {
  const router = useRouter();
  const { data, isLoading, error } = useMe();

  useEffect(() => {
    if (isLoading) return;

    if (error || !data) {
      router.replace('/login' as '/');
      return;
    }

    // Force password change on first login
    if (data.user.must_change_password) {
      router.replace('/change-password' as '/');
      return;
    }

    // Role-based redirect
    switch (data.user.role) {
      case 'student':
        router.replace('/student' as '/');
        break;
      case 'faculty':
      case 'hod':
        router.replace('/faculty' as '/');
        break;
      case 'fees_department':
        router.replace('/fees-dept' as '/');
        break;
      case 'admin':
      case 'super_admin':
        router.replace('/admin' as '/');
        break;
      default:
        router.replace('/student' as '/');
    }
  }, [data, isLoading, error, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
      </div>
    </div>
  );
}
