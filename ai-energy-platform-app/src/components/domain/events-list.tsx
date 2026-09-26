import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import type { MeterEvent } from '@/lib/types';

export function EventsList({ events }: { events: MeterEvent[] }) {
  if (events.length === 0) {
    return (
      <Card>
        <CardHeader title="Operational events" />
        <CardBody>
          <p className="text-sm text-ink-muted">
            No operational events recorded for this meter.
          </p>
        </CardBody>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader title="Operational events" subtitle={`${events.length} event(s)`} />
      <CardBody>
        <ul className="space-y-3">
          {events.map((e) => (
            <li
              key={e.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-surface-border bg-surface-muted px-3 py-2"
            >
              <div>
                <div className="text-xs font-mono uppercase tracking-wide text-ink-subtle">
                  {e.type}
                </div>
                <div className="text-sm text-ink">{e.description || '(no description)'}</div>
              </div>
              <div className="shrink-0 text-right text-xs text-ink-muted">
                {formatDateTime(e.timestamp)}
              </div>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
