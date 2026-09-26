import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import type { MatchedEvent } from '@/lib/types';

export function RelatedEventCard({ event }: { event: MatchedEvent }) {
  return (
    <Card>
      <CardHeader
        title="Related operational event"
        subtitle={
          <span className="font-mono uppercase tracking-wide">
            {event.type} · {formatDateTime(event.timestamp)}
          </span>
        }
      />
      <CardBody>
        <p className="text-sm text-ink">{event.description || '(no description)'}</p>
      </CardBody>
    </Card>
  );
}
