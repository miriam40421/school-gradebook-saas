'use client';

import { FormEvent, Suspense, useState } from 'react';
import { KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { he, translateApiError } from '@/lib/he';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [schoolId, setSchoolId] = useState(searchParams.get('schoolId') ?? '');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const trimmedSchoolId = schoolId.trim();
      if (trimmedSchoolId) {
        await apiFetch('/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ schoolId: trimmedSchoolId, email: email.trim() }),
          headers: { 'x-app-url': window.location.origin },
        });
      } else {
        await apiFetch('/auth/platform/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email: email.trim() }),
          headers: { 'x-app-url': window.location.origin },
        });
      }
      setSent(true);
    } catch (err) {
      setError(translateApiError(err instanceof Error ? err.message : ''));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm" variant="flat">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
            <KeyRound className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text">{he.forgotPasswordTitle}</h1>
            <p className="text-sm text-text-muted">{he.forgotPasswordSubtitle}</p>
          </div>
        </div>

        {sent ? (
          <Alert variant="success" className="mb-4">
            {he.forgotPasswordSent}
          </Alert>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="schoolId">
                {he.schoolId}
                <span className="mr-1 text-xs text-text-muted">(ריק = סופר-אדמין)</span>
              </Label>
              <Input
                id="schoolId"
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                autoComplete="organization"
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
            {error && <Alert variant="error">{error}</Alert>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? he.sendingResetLink : he.sendResetLink}
            </Button>
          </form>
        )}

        <div className="mt-4 border-t border-border pt-3 text-center">
          <Link href="/login" className="text-xs text-text-muted hover:text-text">
            {he.backToLogin}
          </Link>
        </div>
      </Card>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
