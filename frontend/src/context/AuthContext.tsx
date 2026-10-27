'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authApi, getAuthToken, setAuthToken, setUnauthorizedHandler, ApiError } from '../lib/api';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(() => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    setError(null);
    if (pathname !== '/login') {
      router.push('/login');
    }
  }, [pathname, router]);

  // Register 401 callback with API client
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
  }, [logout]);

  // Restore session from token on mount
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const storedToken = getAuthToken();
      if (!storedToken) {
        if (isMounted) {
          setIsLoading(false);
          if (pathname !== '/login') {
            router.push('/login');
          }
        }
        return;
      }

      setToken(storedToken);
      try {
        const me = await authApi.getMe();
        if (isMounted) {
          setUser({
            id: me.id,
            email: me.email,
            fullName: me.full_name,
            isActive: me.is_active,
          });
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          logout();
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [logout, pathname, router]);

  // Route protection
  useEffect(() => {
    if (!isLoading) {
      if (!user && pathname !== '/login') {
        router.push('/login');
      } else if (user && pathname === '/login') {
        router.push('/');
      }
    }
  }, [isLoading, user, pathname, router]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authApi.login({ email, password });
      setAuthToken(result.access_token);
      setToken(result.access_token);

      const me = await authApi.getMe();
      const authUser: AuthUser = {
        id: me.id,
        email: me.email,
        fullName: me.full_name,
        isActive: me.is_active,
      };
      setUser(authUser);
      setIsLoading(false);
      router.push('/');
    } catch (err: any) {
      setIsLoading(false);
      const msg = err instanceof ApiError ? err.message : (err?.message || 'Authentication failed. Please check your credentials.');
      setError(msg);
      throw err;
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user),
        isLoading,
        error,
        login,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
