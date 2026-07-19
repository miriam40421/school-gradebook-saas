'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { AuthUserDto } from '@school/shared';
import { Role } from '@school/shared';
import { apiFetch, clearDeviceToken, clearRefreshToken, clearToken, getDeviceToken, getRefreshToken, getToken, setDeviceToken, setRefreshToken, setToken } from './api';

export type PendingMfa = { mfaToken: string };

type AuthContextValue = {
  user: AuthUserDto | null;
  loading: boolean;
  pendingMfa: PendingMfa | null;
  login: (schoolId: string, email: string, password: string) => Promise<void>;
  platformLogin: (email: string, password: string) => Promise<void>;
  verifyMfa: (code: string, rememberDevice: boolean) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingMfa, setPendingMfaState] = useState<PendingMfa | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = sessionStorage.getItem('pendingMfa');
      return stored ? (JSON.parse(stored) as PendingMfa) : null;
    } catch { return null; }
  });

  const setPendingMfa = (mfa: PendingMfa | null) => {
    if (mfa) sessionStorage.setItem('pendingMfa', JSON.stringify(mfa));
    else sessionStorage.removeItem('pendingMfa');
    setPendingMfaState(mfa);
  };
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

  const redirectAfterLogin = (role: string) => {
    if (role === Role.SuperAdmin) router.replace('/super-admin');
    else if (role === Role.HomeroomTeacher) router.replace('/my-students');
    else if (role === Role.SubjectTeacher) router.replace('/teacher');
    else router.replace('/dashboard');
  };

  const applyTokens = (data: { accessToken: string; refreshToken: string; user: AuthUserDto; deviceToken?: string }) => {
    setToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    if (data.deviceToken) setDeviceToken(data.deviceToken);
    setUser(data.user);
  };

  const platformLogin = async (email: string, password: string) => {
    const deviceToken = getDeviceToken();
    const data = await apiFetch<{ accessToken: string; refreshToken: string; user: AuthUserDto; deviceToken?: string } | { requiresMfa: true; mfaToken: string }>(
      '/auth/platform/login',
      { method: 'POST', body: JSON.stringify({ email, password, deviceToken }) },
    );
    if ('requiresMfa' in data) {
      setPendingMfa({ mfaToken: data.mfaToken });
      return;
    }
    applyTokens(data);
    redirectAfterLogin(data.user.role);
  };

  const login = async (schoolId: string, email: string, password: string) => {
    const deviceToken = getDeviceToken();
    const data = await apiFetch<{ accessToken: string; refreshToken: string; user: AuthUserDto; deviceToken?: string } | { requiresMfa: true; mfaToken: string }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ schoolId, email, password, deviceToken }) },
    );
    if ('requiresMfa' in data) {
      setPendingMfa({ mfaToken: data.mfaToken });
      return;
    }
    applyTokens(data);
    redirectAfterLogin(data.user.role);
  };

  const verifyMfa = async (code: string, rememberDevice: boolean) => {
    if (!pendingMfa) throw new Error('No pending MFA');
    const data = await apiFetch<{ accessToken: string; refreshToken: string; user: AuthUserDto; deviceToken?: string }>(
      '/auth/mfa/verify',
      { method: 'POST', body: JSON.stringify({ mfaToken: pendingMfa.mfaToken, code, rememberDevice }) },
    );
    setPendingMfa(null);
    applyTokens(data);
    redirectAfterLogin(data.user.role);
  };

  const logout = async () => {
    const refreshToken = getRefreshToken();
    await apiFetch('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
    clearToken();
    clearRefreshToken();
    clearDeviceToken();
    sessionStorage.removeItem('pendingMfa');
    window.location.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, pendingMfa, login, platformLogin, verifyMfa, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
