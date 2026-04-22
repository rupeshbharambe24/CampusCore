'use client';

import { ThemeToggle } from '@/components/theme-toggle';
import { motion } from '@/components/motion';
import { GraduationCap, Calendar, CheckSquare, Trophy, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const features = [
  { icon: Calendar, title: 'Live Timetable', desc: 'Real-time schedule for every student and faculty member' },
  { icon: CheckSquare, title: 'Smart Attendance', desc: 'Faculty marks in 30 seconds; students track percentage live' },
  { icon: Trophy, title: 'Activity Tracking', desc: 'Baja, Tifan, NSS — activity attendance with coordinator approval' },
];

export default function HomePage() {
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

      <section className="container flex flex-1 flex-col items-center justify-center gap-8 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary"
        >
          Built for Indian Engineering Colleges
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
        >
          The college runs on{' '}
          <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
            CampusCore
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-xl text-lg text-muted-foreground"
        >
          Attendance, timetable, and activity tracking — replacing paper registers and printed Excel sheets for 5000+ students.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-3"
        >
          <Link
            href="/login"
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
          >
            Sign in
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'}/docs`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-background px-6 text-sm font-semibold transition-all hover:bg-accent hover:border-primary/30"
          >
            API docs
          </a>
        </motion.div>

        {/* Features */}
        <div className="mt-8 grid gap-6 sm:grid-cols-3 max-w-4xl">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
              className="rounded-xl border border-border bg-card p-6 text-left transition-all hover:border-primary/30 hover:shadow-lg"
            >
              <div className="inline-flex rounded-lg bg-primary/10 p-2.5">
                <feat.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-3 font-semibold">{feat.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
        CampusCore v0.1.0 &middot; Built for the college
      </footer>
    </main>
  );
}
