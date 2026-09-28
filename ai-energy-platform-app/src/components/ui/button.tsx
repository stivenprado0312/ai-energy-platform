import clsx from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  children: ReactNode;
}

const VARIANT: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-ink text-white hover:bg-slate-800 focus-visible:ring-ink disabled:bg-slate-400',
  secondary:
    'border border-surface-border bg-white text-ink hover:bg-slate-50 focus-visible:ring-ink',
  ghost:
    'text-ink hover:bg-slate-100 focus-visible:ring-ink',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 disabled:bg-red-300',
};

export function Button({
  variant = 'primary',
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed',
        VARIANT[variant],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      <svg
        aria-hidden
        className={clsx(
          'h-4 w-4 animate-spin transition-opacity',
          loading ? 'opacity-100' : 'opacity-0 pointer-events-none w-0 h-0 -ml-2',
        )}
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
      {children}
    </button>
  );
}
