'use client';

import { FormEvent, useState } from 'react';
import { Eye, EyeOff, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { he, translateApiError } from '@/lib/he';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Spinner } from '@/components/ui/Spinner';
export default function LoginPage() {
  const { login, platformLogin, loading } = useAuth();
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
        await platformLogin(email.trim(), password);
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
      <div className="flex min-h-screen items-center justify-center bg-[#111111]">
        <Spinner label={he.loading} />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen" dir="rtl">

      {/* ── Brand panel ── */}
      <div className="hidden lg:flex lg:w-[44%] flex-col justify-between bg-[#111111] p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
            <GraduationCap className="h-5 w-5 text-white" aria-hidden />
          </div>
          <span className="text-base font-semibold text-white">מערכת ציונים</span>
        </div>

        <div>
          <p className="text-3xl font-bold leading-snug text-white">
            ניהול ציונים ותעודות<br />
            <span className="text-neutral-400">לבתי ספר</span>
          </p>
          <p className="mt-4 text-sm text-neutral-500">גישה מאובטחת · נתוני תלמידים · מעקב מלא</p>
        </div>

        <p className="text-xs text-neutral-600">© 2025 מערכת ניהול בית ספר</p>
      </div>

      {/* ── Form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-surface px-6 py-16 sm:px-10">

        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <GraduationCap className="h-4 w-4 text-white" aria-hidden />
          </div>
          <span className="text-sm font-semibold text-text">מערכת ציונים</span>
        </div>

        <div className="w-full max-w-[340px]">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-text">{he.loginTitle}</h1>
            <p className="mt-1 text-sm text-text-muted">{he.loginSubtitle}</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
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
              <div className="mb-1 flex items-center justify-between">
                <Label htmlFor="password" className="!mb-0">{he.password}</Label>
                <Link
                  href={`/forgot-password${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`}
                  className="text-xs text-primary hover:underline"
                >
                  {he.forgotPassword}
                </Link>
              </div>
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
                  aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                  className="ui-eye-toggle absolute inset-y-0 end-0 flex items-center pe-3 text-text-muted hover:text-text"
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4" aria-hidden />
                    : <Eye className="h-4 w-4" aria-hidden />}
                </button>
              </div>
            </div>

            {error && <Alert variant="error">{error}</Alert>}

            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="w-full !border-primary !bg-primary !text-white hover:!bg-primary-hover hover:!border-primary-hover"
            >
              {submitting ? he.signingIn : he.signIn}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
