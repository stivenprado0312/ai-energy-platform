'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import clsx from 'clsx';

const DEMO_AUTH_KEY = 'demo-authed';

export function AuthIndicator() {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setAuthed(window.localStorage.getItem(DEMO_AUTH_KEY) === '1');
  }, [pathname]);

  const signOut = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(DEMO_AUTH_KEY);
    }
    router.replace('/login');
  };

  if (pathname === '/login') return null;

  if (!authed) {
    return (
      <Link
        href="/login"
        className={clsx(
          'rounded-md px-3 py-2 text-ink-muted transition-colors hover:bg-slate-100 hover:text-ink',
        )}
      >
        Sign in
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="rounded-md px-3 py-2 text-ink-muted transition-colors hover:bg-slate-100 hover:text-ink"
      data-testid="sign-out"
    >
      Sign out
    </button>
  );
}
