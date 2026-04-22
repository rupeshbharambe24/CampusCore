'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/schemas';
import { ThemeToggle } from '@/components/theme-toggle';
import { GraduationCap, Mail, CheckCircle2, ArrowLeft } from 'lucide-react';
import { motion } from '@/components/motion';
import Link from 'next/link';

function ResetForm() {
  const searchParams = useSearchParams();
  const hasCode = searchParams.has('code');
  const [sent, setSent] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetDone, setResetDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  async function onSendLink(data: ResetPasswordInput) {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password?code=true`,
    });
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  async function onUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setError(error.message);
    } else {
      setResetDone(true);
    }
  }

  // Step 2: set new password (arrived via reset link)
  if (hasCode && !resetDone) {
    return (
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Set new password</h1>
          <p className="text-sm text-muted-foreground">Enter your new password below</p>
        </div>
        <form onSubmit={onUpdatePassword} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="newPassword" className="text-sm font-medium">New Password</label>
            <input
              id="newPassword"
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            Update Password
          </button>
        </form>
      </div>
    );
  }

  // Step 2 done
  if (resetDone) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
        <h1 className="text-2xl font-bold">Password updated</h1>
        <p className="text-sm text-muted-foreground">Your password has been reset. You can now sign in.</p>
        <Link href="/login" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Go to Sign in
        </Link>
      </motion.div>
    );
  }

  // Step 1: send reset link
  if (sent) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm space-y-4 text-center">
        <Mail className="mx-auto h-12 w-12 text-primary" />
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          We sent a password reset link to your email. Click the link to set a new password.
        </p>
        <Link href="/login" className="text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="mr-1 inline-block h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Reset password</h1>
        <p className="text-sm text-muted-foreground">Enter your email to receive a reset link</p>
      </div>
      <form onSubmit={handleSubmit(onSendLink)} className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@college.edu"
            {...register('email')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {isSubmitting ? 'Sending...' : 'Send reset link'}
        </button>
      </form>
      <p className="text-center text-xs text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">
          <ArrowLeft className="mr-1 inline-block h-3 w-3" />
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">CampusCore</span>
        </div>
        <ThemeToggle />
      </header>
      <section className="container flex flex-1 flex-col items-center justify-center py-16">
        <Suspense fallback={<div className="text-sm text-muted-foreground">Loading...</div>}>
          <ResetForm />
        </Suspense>
      </section>
    </main>
  );
}
