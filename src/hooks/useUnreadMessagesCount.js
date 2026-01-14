'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useUnreadMessagesCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      const { data, error } = await supabase
        .from('messages')
        .select('id, read_at')
        .eq('user_id', session.user.id);

      if (!error && data) {
        setCount(data.filter((m) => !m.read_at).length);
      }
    };

    void load();
  }, []);

  return count;
}
