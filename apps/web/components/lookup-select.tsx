'use client';

import { cn } from '@/lib/utils';
import type { LookupItem } from '@/lib/lookup-hooks';
import { Loader2 } from 'lucide-react';

export function LookupSelect({
  items,
  isLoading,
  value,
  onChange,
  placeholder = 'Select...',
  className,
}: {
  items: LookupItem[] | undefined;
  isLoading: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  if (isLoading) {
    return (
      <div className={cn('flex h-10 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground', className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring',
        !value && 'text-muted-foreground',
        className,
      )}
    >
      <option value="">{placeholder}</option>
      {(items ?? []).map((item) => (
        <option key={item.id} value={item.id}>
          {item.label}
        </option>
      ))}
    </select>
  );
}
