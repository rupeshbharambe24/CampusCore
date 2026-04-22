'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    // Only register SW in production — in dev it causes stale cache issues
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration failed:', err);
      });
    }
  }, []);

  return null;
}
