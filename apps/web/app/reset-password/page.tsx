'use client';

import { FormEvent, Suspense, useState } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { he, translateApiError } from '@/lib/he';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError(he.passwordTooShort); return; }
    if (password !== confirm) { setError(he.passwordMismatch); return; }
    setSubmitting(true);
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setSuccess(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('תקף') || msg.includes('תוקף') || msg.includes('400')) {
        setError(he.resetPasswordInvalidToken);
      } else {
        setError(translateApiError(msg));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <main className="aurora-bg flex min-h-screen items-center justify-center p-4">
        <Card className="relative z-10 w-full max-w-md shadow-elevation4">
          <Alert variant="error">{he.resetPasswordInvalidToken}</Alert>
          <div className="mt-4 text-center">
            <Link href="/login" className="text-xs text-primary hover:underline">{he.backToLogin}</Link>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="aurora-bg flex min-h-screen items-center justify-center p-4">
      <Card className="relative z-10 w-full max-w-md shadow-elevation4">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
            <KeyRound className="h-6 w-6 text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text">{he.resetPasswordTitle}</h1>
            <p className="text-sm text-text-muted">{he.resetPasswordSubtitle}</p>
          </div>
        </div>

        {success ? (
          <>
            <Alert variant="success" className="mb-4">{he.resetPasswordSuccess}</Alert>
            <Link href="/login">
              <Button className="w-full">{he.backToLogin}</Button>
            </Link>
          </>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">{he.newPassword}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pe-10"
                  autoComplete="new-password"
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
            </div>
            <div>
              <Label htmlFor="confirm">{he.confirmPassword}</Label>
              <Input
                id="confirm"
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            {error && <Alert variant="error">{error}</Alert>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? he.saving : he.save}
            </Button>
          </form>
        )}

        {!success && (
          <div className="mt-4 border-t border-slate-100 pt-3 text-center">
            <Link href="/login" className="text-xs text-text-muted hover:text-text">
              {he.backToLogin}
            </Link>
          </div>
        )}
      </Card>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
