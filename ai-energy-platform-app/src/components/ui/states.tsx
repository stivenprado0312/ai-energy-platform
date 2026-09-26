import clsx from 'clsx';
import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-surface-border bg-white px-6 py-12 text-center',
        className,
      )}
    >
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-ink-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
}: {
  title?: string;
  description?: ReactNode;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-5">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
          !
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-700">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm text-red-700/80">{description}</p>
          ) : null}
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              Retry
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function LoadingBlock({
  rows = 3,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={clsx('animate-pulse space-y-3', className)}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 w-full rounded bg-slate-200" />
      ))}
    </div>
  );
}
