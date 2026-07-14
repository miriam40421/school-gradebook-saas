'use client';

import { FormEvent, useState } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { apiFetch, setToken } from '@/lib/api';
import type { AuthUserDto } from '@school/shared';
import { he, translateApiError } from '@/lib/he';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Spinner } from '@/components/ui/Spinner';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const router = useRouter();
  const [schoolId, setSchoolId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (!schoolId.trim()) {
        try {
          const data = await apiFetch<{ accessToken: string; user: AuthUserDto }>(
            '/auth/platform/login',
            { method: 'POST', body: JSON.stringify({ email: email.trim(), password }) },
          );
          setToken(data.accessToken);
          router.replace('/super-admin');
          window.location.replace('/super-admin');
        } catch (err) {
          const msg = err instanceof Error ? err.message : he.loginFailed;
          setError(translateApiError(msg));
        }
      } else {
        await login(schoolId.trim(), email.trim(), password);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : he.loginFailed;
      setError(translateApiError(msg));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="aurora-bg flex min-h-screen items-center justify-center">
        <Spinner label={he.loading} />
      </div>
    );
  }

  return (
    <main className="aurora-bg flex min-h-screen items-center justify-center p-4">
      <Card className="relative z-10 w-full max-w-md shadow-elevation4">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
            <LogIn className="h-6 w-6 text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text">{he.loginTitle}</h1>
            <p className="text-sm text-text-muted">{he.loginSubtitle}</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="schoolId">{he.schoolId}</Label>
            <Input
              id="schoolId"
              type="text"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              autoComplete="organization"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>
          <div>
            <Label htmlFor="email">{he.email}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <Label htmlFor="password">{he.password}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="pe-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 end-0 flex items-center pe-3 text-text-muted hover:text-text"
                aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
              >
                {showPassword
                  ? <EyeOff className="h-4 w-4" aria-hidden />
                  : <Eye className="h-4 w-4" aria-hidden />}
              </button>
            </div>
            <div className="mt-1 text-end">
              <Link
                href={`/forgot-password${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`}
                className="text-xs text-primary hover:underline"
              >
                {he.forgotPassword}
              </Link>
            </div>
          </div>
          {error && <Alert variant="error">{error}</Alert>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? he.signingIn : he.signIn}
          </Button>
        </form>
      </Card>
    </main>
  );
}
