'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { AuthUserDto } from '@school/shared';
import { Role } from '@school/shared';
import { apiFetch, clearToken, getToken, setToken } from './api';

type AuthContextValue = {
  user: AuthUserDto | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const loadMe = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch<{ user: AuthUserDto }>('/auth/me');
      setUser(data.user);
    } catch {
      clearToken();
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
    const isLogin = pathname === '/login';
    if (!user && !isLogin) {
      router.replace('/login');
    } else if (user && isLogin) {
      if (user.role === Role.HomeroomTeacher) {
        router.replace('/my-students');
      } else if (user.role === Role.SubjectTeacher) {
        router.replace('/teacher');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, pathname, router]);

  const login = async (email: string, password: string) => {
    const data = await apiFetch<{ accessToken: string; user: AuthUserDto }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    );
    setToken(data.accessToken);
    setUser(data.user);
    if (data.user.role === Role.HomeroomTeacher) {
      router.replace('/my-students');
    } else if (data.user.role === Role.SubjectTeacher) {
      router.replace('/teacher');
    } else {
      router.replace('/dashboard');
    }
  };

  const logout = () => {
    clearToken();
    setUser(null);
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
