'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Calendar,
  CheckSquare,
  ClipboardList,
  FileText,
  GraduationCap,
  Home,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Moon,
  Sun,
  Trophy,
  User,
  Users,
  Bell,
  BarChart3,
  Building2,
  ScrollText,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { motion } from '@/components/motion';
import { useEffect, useState } from 'react';

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

const studentNav: NavItem[] = [
  { label: 'Dashboard', href: '/student', icon: Home },
  { label: 'Timetable', href: '/student/timetable', icon: Calendar },
  { label: 'Attendance', href: '/student/attendance', icon: CheckSquare },
  { label: 'Activity Requests', href: '/student/activities', icon: Trophy },
  { label: 'Exams & Results', href: '/student/exams', icon: ClipboardList },
  { label: 'Study Materials', href: '/student/materials', icon: BookOpen },
  { label: 'Fees & Payments', href: '/student/fees', icon: IndianRupee },
  { label: 'Leave Applications', href: '/student/leaves', icon: FileText },
  { label: 'Notifications', href: '/student/notifications', icon: Bell },
  { label: 'Profile', href: '/student/profile', icon: User },
];

const facultyNav: NavItem[] = [
  { label: 'Dashboard', href: '/faculty', icon: Home },
  { label: 'Today\'s Classes', href: '/faculty/today', icon: Calendar },
  { label: 'My Classes', href: '/faculty/classes', icon: BookOpen },
  { label: 'Study Materials', href: '/faculty/materials', icon: BookOpen },
  { label: 'Activity Approvals', href: '/faculty/approvals', icon: ClipboardList },
  { label: 'Notifications', href: '/faculty/notifications', icon: Bell },
  { label: 'Profile', href: '/faculty/profile', icon: User },
];

const hodNav: NavItem[] = [
  { label: 'Dashboard', href: '/faculty', icon: Home },
  { label: 'Leave Approvals', href: '/faculty/leaves', icon: FileText },
  { label: 'Dept Faculty', href: '/faculty/dept-faculty', icon: Users },
  { label: 'Dept Students', href: '/faculty/dept-students', icon: GraduationCap },
  { label: 'Today\'s Classes', href: '/faculty/today', icon: Calendar },
  { label: 'My Classes', href: '/faculty/classes', icon: BookOpen },
  { label: 'Study Materials', href: '/faculty/materials', icon: BookOpen },
  { label: 'Activity Approvals', href: '/faculty/approvals', icon: ClipboardList },
  { label: 'Notifications', href: '/faculty/notifications', icon: Bell },
  { label: 'Profile', href: '/faculty/profile', icon: User },
];

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Academic Structure', href: '/admin/academic', icon: Building2 },
  { label: 'Timetable', href: '/admin/timetable', icon: Calendar },
  { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Exams', href: '/admin/exams', icon: ClipboardList },
  { label: 'Audit Log', href: '/admin/audit-log', icon: ScrollText },
  { label: 'Notifications', href: '/admin/notifications', icon: Bell },
];

const feesDeptNav: NavItem[] = [
  { label: 'Dashboard', href: '/fees-dept', icon: Home },
  { label: 'Notifications', href: '/fees-dept/notifications', icon: Bell },
];

function getNavForRole(role: string): NavItem[] {
  switch (role) {
    case 'student':
      return studentNav;
    case 'hod':
      return hodNav;
    case 'faculty':
      return facultyNav;
    case 'fees_department':
      return feesDeptNav;
    case 'admin':
    case 'super_admin':
      return adminNav;
    default:
      return studentNav;
  }
}

export function Sidebar({
  role,
  userName,
  userEmail,
  collapsed = false,
}: {
  role: string;
  userName: string;
  userEmail: string;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const nav = getNavForRole(role);
  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-border bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
          <GraduationCap className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-lg font-bold tracking-tight"
          >
            CampusCore
          </motion.span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        <ul className="space-y-1">
          {nav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href as '/'}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
                  {!collapsed && <span>{item.label}</span>}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 h-8 w-1 rounded-r-full bg-primary"
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border p-3 space-y-2">
        {/* Theme toggle */}
        <button
          type="button"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          {!collapsed && <span>{isDark ? 'Light mode' : 'Dark mode'}</span>}
        </button>

        {/* User info */}
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
            {userName.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{userName}</p>
              <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
            </div>
          )}
        </div>

        {/* Sign out */}
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem('campuscore_token');
            window.location.href = '/login';
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
