'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Check session on mount
  const checkSession = useCallback(async () => {
    try {
      setLoading(true);
      const session = await auth.getSession();
      
      if (session.authenticated) {
        setUser(session.user);
        setProfile(session.profile);
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch (err) {
      console.error('Session check failed:', err);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (email, password) => {
    try {
      setError(null);
      const result = await auth.login(email, password);
      
      if (result.success) {
        // Refresh session to get full profile
        await checkSession();
        return { success: true };
      }
      
      return { success: false, error: 'Login failed' };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    try {
      await auth.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setProfile(null);
      router.push('/portal/login');
    }
  };

  const requestPasswordReset = async (email) => {
    try {
      setError(null);
      const result = await auth.requestPasswordReset(email);
      return { success: true, message: result.message };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      setError(null);
      const result = await auth.resetPassword(token, newPassword);
      return { success: true, message: result.message };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const refreshProfile = async () => {
    await checkSession();
  };

  const value = {
    user,
    profile,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'admin',
    login,
    logout,
    requestPasswordReset,
    resetPassword,
    refreshProfile,
    checkSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

/**
 * Hook for protected routes - redirects to login if not authenticated
 */
export function useRequireAuth(redirectTo = '/portal/login') {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, loading, router, redirectTo]);

  return { isAuthenticated, loading };
}

/**
 * Hook for admin-only routes
 */
export function useRequireAdmin(redirectTo = '/portal') {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.replace('/portal/login');
      } else if (!isAdmin) {
        router.replace(redirectTo);
      }
    }
  }, [isAuthenticated, isAdmin, loading, router, redirectTo]);

  return { isAuthenticated, isAdmin, loading };
}

export default AuthContext;
