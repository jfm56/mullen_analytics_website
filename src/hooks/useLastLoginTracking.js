import { useEffect } from 'react';
import { auth } from '@/lib/api';

/**
 * Hook to track last login time using FastAPI backend.
 * Replaces Supabase-based tracking.
 */
export function useLastLoginTracking() {
  useEffect(() => {
    const updateLastLogin = async () => {
      try {
        // Check session via FastAPI
        const session = await auth.getSession();
        if (!session.authenticated) {
          // Silently skip - user not logged in
          return;
        }

        // Update last login via FastAPI profile endpoint
        await fetch('/api/proxy/profiles/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ last_login: new Date().toISOString() }),
        });
      } catch (error) {
        // Silently fail - don't break the app if last login tracking fails
      }
    };

    updateLastLogin();
  }, []);
}

// For use in client portal pages
export default useLastLoginTracking;
