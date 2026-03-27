/**
 * DEPRECATED: Supabase admin client is being replaced by FastAPI backend.
 * This file is kept temporarily for admin API routes that still use Supabase.
 * 
 * TODO: Remove this file once all API routes are migrated to FastAPI.
 */

// Mock admin client - prevents network requests to dead Supabase server
const mockSupabaseAdmin = {
  auth: {
    admin: {
      listUsers: async () => ({ data: { users: [] }, error: null }),
      getUserById: async () => ({ data: { user: null }, error: null }),
      createUser: async () => ({ data: null, error: { message: 'Supabase is disabled.' } }),
      deleteUser: async () => ({ error: { message: 'Supabase is disabled.' } }),
      updateUserById: async () => ({ data: null, error: { message: 'Supabase is disabled.' } }),
    },
  },
  from: (/** @type {string} */ _table) => ({
    select: (/** @type {string} */ _cols) => ({ 
      data: [], 
      error: null, 
      single: () => ({ data: null, error: null }),
      eq: function(/** @type {string} */ _col, /** @type {any} */ _val) { return this; },
      order: function(/** @type {string} */ _col) { return this; },
    }),
    insert: () => ({ data: null, error: { message: 'Supabase is disabled.' }, select: () => ({ data: null, error: { message: 'Supabase is disabled.' } }) }),
    update: () => ({ data: null, error: { message: 'Supabase is disabled.' }, eq: () => ({ data: null, error: { message: 'Supabase is disabled.' } }) }),
    delete: () => ({ error: { message: 'Supabase is disabled.' }, eq: () => ({ error: { message: 'Supabase is disabled.' } }) }),
    upsert: () => ({ data: null, error: { message: 'Supabase is disabled.' } }),
    eq: function(/** @type {string} */ _col, /** @type {any} */ _val) { return this; },
    order: function(/** @type {string} */ _col) { return this; },
    limit: function(/** @type {number} */ _n) { return this; },
  }),
  storage: {
    from: () => ({
      upload: async () => ({ error: { message: 'Supabase storage is disabled.' } }),
      download: async () => ({ error: { message: 'Supabase storage is disabled.' } }),
      remove: async () => ({ error: { message: 'Supabase storage is disabled.' } }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
      createSignedUrl: async () => ({ data: null, error: { message: 'Supabase storage is disabled.' } }),
    }),
  },
};

export const supabaseAdmin = mockSupabaseAdmin;
