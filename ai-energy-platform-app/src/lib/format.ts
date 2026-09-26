// Tiny formatting helpers used across the UI.

export function formatKwh(n: number, decimals = 2): string {
  return `${n.toFixed(decimals)} kWh`;
}

export function formatNumber(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

export function formatPercent(n: number, decimals = 1): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

export function formatRange(start: string | null | undefined, end: string | null | undefined): string {
  if (!start || !end) return '—';
  return `${formatDateTime(start)} → ${formatDateTime(end)}`;
}

export function formatDurationHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${hours.toFixed(0)} h`;
  const days = Math.floor(hours / 24);
  const rem = hours - days * 24;
  return rem === 0 ? `${days} d` : `${days} d ${rem.toFixed(0)} h`;
}
