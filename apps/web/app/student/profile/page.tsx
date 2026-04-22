'use client';

import { motion } from '@/components/motion';
import { useMe } from '@/lib/hooks';
import { User, Mail, Hash, BookOpen, Calendar, Shield, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { data, isLoading } = useMe();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const user = data?.user;
  const student = data?.student;

  return (
    <div className="space-y-6">
      <motion.h1
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-2xl font-bold tracking-tight"
      >
        <User className="mr-2 inline-block h-6 w-6 text-primary" />
        Profile
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        {/* Avatar + Name */}
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary text-3xl font-bold">
            {user?.full_name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div>
            <h2 className="text-xl font-bold">{user?.full_name}</h2>
            <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>

        {/* Details grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{user?.email}</p>
            </div>
          </div>

          {student && (
            <>
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <Hash className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Roll Number</p>
                  <p className="text-sm font-medium">{student.roll_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Branch</p>
                  <p className="text-sm font-medium">{student.branch_id}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Admission Year</p>
                  <p className="text-sm font-medium">{student.admission_year}</p>
                </div>
              </div>
              {student.lab_batch && (
                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Lab Batch</p>
                    <p className="text-sm font-medium">{student.lab_batch}</p>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Member Since</p>
              <p className="text-sm font-medium">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <Link
            href="/change-password"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Change Password
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
