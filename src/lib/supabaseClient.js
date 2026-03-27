/**
 * DEPRECATED: Supabase client is being replaced by FastAPI backend.
 * This file is kept temporarily for admin pages that still use Supabase.
 * Portal pages now use src/lib/api.js instead.
 * 
 * TODO: Remove this file once admin pages are migrated.
 */

// Create a mock client that doesn't make network requests
// This prevents the Supabase SDK from trying to connect to the dead server
const mockSupabase = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    signInWithPassword: async () => ({ data: null, error: { message: 'Supabase is disabled. Use /portal/login instead.' } }),
    signUp: async () => ({ data: null, error: { message: 'Supabase is disabled. Use /portal/login instead.' } }),
    signOut: async () => ({ error: null }),
    resetPasswordForEmail: async () => ({ error: { message: 'Supabase is disabled. Use FastAPI password reset.' } }),
    updateUser: async () => ({ error: { message: 'Supabase is disabled.' } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  from: () => ({
    select: () => ({ data: [], error: null, single: () => ({ data: null, error: null }) }),
    insert: () => ({ data: null, error: { message: 'Supabase is disabled.' } }),
    update: () => ({ data: null, error: { message: 'Supabase is disabled.' }, eq: () => ({ data: null, error: { message: 'Supabase is disabled.' } }) }),
    delete: () => ({ error: { message: 'Supabase is disabled.' }, eq: () => ({ error: { message: 'Supabase is disabled.' } }) }),
    eq: function() { return this; },
    order: function() { return this; },
    limit: function() { return this; },
  }),
  storage: {
    from: () => ({
      upload: async () => ({ error: { message: 'Supabase storage is disabled.' } }),
      download: async () => ({ error: { message: 'Supabase storage is disabled.' } }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
};

export const supabase = mockSupabase;
