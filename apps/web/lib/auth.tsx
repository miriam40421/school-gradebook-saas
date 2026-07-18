'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { AuthUserDto } from '@school/shared';
import { Role } from '@school/shared';
import { apiFetch, clearRefreshToken, clearToken, getRefreshToken, getToken, setRefreshToken, setToken } from './api';

type AuthContextValue = {
  user: AuthUserDto | null;
  loading: boolean;
  login: (schoolId: string, email: string, password: string) => Promise<void>;
  platformLogin: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const loadMe = useCallback(async () => {
    const token = getToken();
    const refresh = getRefreshToken();
    if (!token && !refresh) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch<{ user: AuthUserDto }>('/auth/me');
      setUser(data.user);
    } catch {
      clearToken();
      clearRefreshToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  useEffect(() => {
    if (loading) return;
    const isLogin =
      pathname === '/login' ||
      pathname === '/super-admin/login' ||
      pathname === '/forgot-password' ||
      pathname === '/reset-password';
    if (!user && !isLogin) {
      router.replace('/login');
    } else if (user && isLogin) {
      if (user.role === Role.SuperAdmin) {
        router.replace('/super-admin');
      } else if (user.role === Role.HomeroomTeacher) {
        router.replace('/my-students');
      } else if (user.role === Role.SubjectTeacher) {
        router.replace('/teacher');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, pathname, router]);

  const platformLogin = async (email: string, password: string) => {
    const data = await apiFetch<{ accessToken: string; refreshToken: string; user: AuthUserDto }>(
      '/auth/platform/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    );
    setToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setUser(data.user);
    router.replace('/super-admin');
  };

  const login = async (schoolId: string, email: string, password: string) => {
    const data = await apiFetch<{ accessToken: string; refreshToken: string; user: AuthUserDto }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ schoolId, email, password }) },
    );
    setToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setUser(data.user);
    if (data.user.role === Role.SuperAdmin) {
      router.replace('/super-admin');
    } else if (data.user.role === Role.HomeroomTeacher) {
      router.replace('/my-students');
    } else if (data.user.role === Role.SubjectTeacher) {
      router.replace('/teacher');
    } else {
      router.replace('/dashboard');
    }
  };

  const logout = async () => {
    const refreshToken = getRefreshToken();
    await apiFetch('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
    clearToken();
    clearRefreshToken();
    window.location.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, platformLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
