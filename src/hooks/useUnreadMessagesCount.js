'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/api';

/**
 * Hook to get unread messages count using FastAPI backend.
 * Replaces Supabase-based counting.
 */
export function useUnreadMessagesCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const session = await auth.getSession();
        if (!session.authenticated) return;

        const res = await fetch('/api/proxy/messages/unread-count', {
          credentials: 'include',
        });
        
        if (res.ok) {
          const data = await res.json();
          setCount(data.count || 0);
        }
      } catch (error) {
        // Silently fail
      }
    };

    void load();
  }, []);

  return count;
}
