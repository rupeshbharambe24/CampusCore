'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useMe, type MeResponse } from '@/lib/hooks';

interface AuthContextValue {
  me: MeResponse | undefined;
  isLoading: boolean;
  error: Error | null;
  role: string;
  userName: string;
  userEmail: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, error } = useMe();

  const value: AuthContextValue = {
    me: data,
    isLoading,
    error: error as Error | null,
    role: data?.user.role ?? 'student',
    userName: data?.user.full_name ?? '',
    userEmail: data?.user.email ?? '',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
