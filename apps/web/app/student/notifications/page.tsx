'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { Bell, CheckCircle2, XCircle, Calendar, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications, useMarkAllRead } from '@/lib/hooks';

const iconMap: Record<string, { icon: React.ElementType; color: string }> = {
  'activity.approved': { icon: CheckCircle2, color: 'text-success bg-success/10' },
  'activity.rejected': { icon: XCircle, color: 'text-destructive bg-destructive/10' },
  'activity.request_submitted': { icon: Bell, color: 'text-warning bg-warning/10' },
  'timetable.changed': { icon: Calendar, color: 'text-info bg-info/10' },
  'attendance.warning': { icon: Bell, color: 'text-warning bg-warning/10' },
};

const defaultIcon = { icon: Info, color: 'text-primary bg-primary/10' };

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();
  const markAllRead = useMarkAllRead();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const items = notifications ?? [];
  const unread = items.filter((n) => !n.is_read).length;

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
            onClick={() => markAllRead.mutate()}
            className="text-sm font-medium text-primary hover:underline"
          >
            Mark all as read
          </motion.button>
        )}
      </div>

      {unread > 0 && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted-foreground">
          You have <strong className="text-foreground">{unread}</strong> unread notification{unread !== 1 ? 's' : ''}
        </motion.p>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Bell className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-lg font-medium text-muted-foreground">No notifications</p>
        </div>
      ) : (
        <StaggerList className="space-y-3">
          {items.map((notif) => {
            const config = iconMap[notif.type] ?? defaultIcon;
            const Icon = config.icon;
            return (
              <StaggerItem key={notif.id}>
                <div
                  className={cn(
                    'rounded-xl border bg-card p-4 transition-all hover:shadow-md',
                    !notif.is_read && 'border-primary/20 bg-primary/[0.02]',
                  )}
                >
                  <div className="flex gap-3">
                    <div className={cn('mt-0.5 shrink-0 rounded-lg p-2', config.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={cn('text-sm font-medium', !notif.is_read && 'font-semibold')}>
                          {notif.title}
                        </h3>
                        {!notif.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary mt-1.5" />}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{notif.body}</p>
                      <p className="mt-1.5 text-xs text-muted-foreground/70">
                        {new Date(notif.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerList>
      )}
    </div>
  );
}
