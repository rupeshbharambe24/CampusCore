'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { Bell, CheckCircle2, XCircle, Calendar, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const notifications = [
  { id: '1', type: 'activity.approved', title: 'Activity attendance approved', body: 'Your Baja SAE attendance request (Apr 15-17) has been approved.', time: '2 hours ago', read: false },
  { id: '2', type: 'timetable.changed', title: 'Timetable updated', body: 'Your Wednesday DS Lab has been moved to Lab-203.', time: '1 day ago', read: false },
  { id: '3', type: 'activity.rejected', title: 'Activity attendance rejected', body: 'Your NSS request was rejected: Not registered as NSS volunteer.', time: '2 days ago', read: true },
  { id: '4', type: 'attendance.warning', title: 'Attendance warning', body: 'Your Digital Electronics attendance has dropped below 75% (72%).', time: '3 days ago', read: true },
  { id: '5', type: 'general', title: 'Welcome to CampusCore', body: 'Your account has been set up. Explore your timetable and track attendance.', time: '1 week ago', read: true },
];

const iconMap: Record<string, { icon: React.ElementType; color: string }> = {
  'activity.approved': { icon: CheckCircle2, color: 'text-success bg-success/10' },
  'activity.rejected': { icon: XCircle, color: 'text-destructive bg-destructive/10' },
  'timetable.changed': { icon: Calendar, color: 'text-info bg-info/10' },
  'attendance.warning': { icon: Bell, color: 'text-warning bg-warning/10' },
  general: { icon: Info, color: 'text-primary bg-primary/10' },
};

export default function NotificationsPage() {
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-bold tracking-tight"
        >
          <Bell className="mr-2 inline-block h-6 w-6 text-primary" />
          Notifications
        </motion.h1>
        {unread > 0 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-medium text-primary hover:underline"
          >
            Mark all as read
          </motion.button>
        )}
      </div>

      {unread > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-muted-foreground"
        >
          You have <strong className="text-foreground">{unread}</strong> unread notification{unread !== 1 ? 's' : ''}
        </motion.p>
      )}

      <StaggerList className="space-y-3">
        {notifications.map((notif) => {
          const config = iconMap[notif.type] ?? iconMap.general!;
          const Icon = config.icon;
          return (
            <StaggerItem key={notif.id}>
              <div
                className={cn(
                  'rounded-xl border bg-card p-4 transition-all hover:shadow-md',
                  !notif.read && 'border-primary/20 bg-primary/[0.02]',
                )}
              >
                <div className="flex gap-3">
                  <div className={cn('mt-0.5 shrink-0 rounded-lg p-2', config.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={cn('text-sm font-medium', !notif.read && 'font-semibold')}>
                        {notif.title}
                      </h3>
                      {!notif.read && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary mt-1.5" />
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{notif.body}</p>
                    <p className="mt-1.5 text-xs text-muted-foreground/70">{notif.time}</p>
                  </div>
                </div>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerList>
    </div>
  );
}
