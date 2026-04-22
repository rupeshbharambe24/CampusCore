'use client';

import { motion } from '@/components/motion';
import { cn } from '@/lib/utils';

export function AttendanceRing({
  percentage,
  size = 120,
  strokeWidth = 10,
  label,
  className,
  delay = 0,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
  delay?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const color =
    percentage >= 75 ? 'hsl(var(--success))' : percentage >= 50 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))';

  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: delay + 0.4 }}
          className="text-2xl font-bold"
        >
          {percentage}%
        </motion.span>
      </div>
      {label && <span className="mt-2 text-xs font-medium text-muted-foreground">{label}</span>}
    </div>
  );
}
