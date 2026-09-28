'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';

const DEMO_AUTH_KEY = 'demo-authed';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    // Mock auth: any non-empty credentials are accepted.
    // The challenge does not require real authentication; this route
    // exists to satisfy the "Login → Dashboard" entry point in the demo.
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DEMO_AUTH_KEY, '1');
    }
    router.push('/');
  };

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-12">
      <div className="text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-md bg-ink text-lg font-bold text-white">
          AI
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Access the AI Energy Management dashboard.
        </p>
      </div>

      <Card>
        <CardBody>
          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="flex flex-col gap-1 text-xs font-medium text-ink-muted">
              <span className="uppercase tracking-wide">Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@bia.app"
                className="rounded-md border border-surface-border bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-ink-muted">
              <span className="uppercase tracking-wide">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="rounded-md border border-surface-border bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/30"
              />
            </label>
            <Button type="submit" loading={submitting} disabled={!canSubmit}>
              Sign in
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
