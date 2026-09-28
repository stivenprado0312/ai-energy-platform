import Link from 'next/link';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { RerunAnalysisButton } from '@/components/domain/rerun-analysis-button';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Not found</h1>
        <p className="mt-1 text-sm text-ink-muted">
          The resource you requested does not exist. It may have been removed
          or never persisted.
        </p>
      </div>

      <Card>
        <CardHeader title="What can you do?" />
        <CardBody>
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
            <li>
              Go back to the{' '}
              <Link href="/anomalies" className="font-medium text-blue-700 hover:underline">
                anomalies list
              </Link>{' '}
              to pick a current record.
            </li>
            <li>
              Return to the{' '}
              <Link href="/" className="font-medium text-blue-700 hover:underline">
                dashboard
              </Link>
              .
            </li>
            <li>
              Re-run the analysis to refresh the dataset with the latest anomalies.
            </li>
          </ul>
          <div className="mt-4">
            <RerunAnalysisButton />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
