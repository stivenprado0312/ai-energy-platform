import type { Metadata } from 'next';
import Link from 'next/link';
import './../styles/globals.css';
import { AuthIndicator } from '@/components/ui/auth-indicator';

export const metadata: Metadata = {
  title: 'AI Energy Platform',
  description: 'Electrical energy monitoring and anomaly management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface-muted text-ink antialiased">
        <header className="border-b border-surface-border bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-ink text-sm font-bold text-white">
                AI
              </span>
              <span className="text-base font-semibold tracking-tight">
                Energy Platform
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm font-medium">
              <NavLink href="/">Dashboard</NavLink>
              <NavLink href="/meters">Meters</NavLink>
              <NavLink href="/anomalies">Anomalies</NavLink>
              <AuthIndicator />
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-6 py-6 text-xs text-ink-subtle">
          Deterministic analytics on top of PostgreSQL. Explanations produced by the
          StubDeterministic AI provider.
        </footer>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-2 text-ink-muted transition-colors hover:bg-slate-100 hover:text-ink"
    >
      {children}
    </Link>
  );
}
