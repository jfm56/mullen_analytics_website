import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useLastLoginTracking() {
  useEffect(() => {
    const updateLastLogin = async () => {
      try {
        // Only update if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('No session found, skipping last login update');
          return;
        }

        console.log('Updating last login for user:', session.user.id);

        // Try the main endpoint first
        let response = await fetch('/api/auth/update-last-login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
        });

        // If main endpoint fails, try fallback
        if (!response.ok) {
          console.log('Main endpoint failed, trying fallback...');
          response = await fetch('/api/auth/update-last-login-fallback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
          });
        }

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Both endpoints failed to update last login:', errorData);
          return;
        }

        const result = await response.json();
        console.log('Last login updated successfully:', result);
        
      } catch (error) {
        // Silently fail - don't break the app if last login tracking fails
        console.warn('Failed to update last login:', error);
      }
    };

    // Update last login on component mount
    updateLastLogin();
  }, []);
}

// For use in client portal pages
export default useLastLoginTracking;
