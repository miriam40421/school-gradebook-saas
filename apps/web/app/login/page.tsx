'use client';

import { FormEvent, useState } from 'react';
import { LogIn } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { he, translateApiError } from '@/lib/he';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Spinner } from '@/components/ui/Spinner';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('admin@demo-a.local');
  const [password, setPassword] = useState('DemoAdmin1!');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
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
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
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
