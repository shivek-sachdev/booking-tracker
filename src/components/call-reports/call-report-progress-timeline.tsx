'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatDate, formatTimestamp } from '@/lib/utils/formatting';
import { getCallReportStatusStyles } from '@/lib/utils/call-report-status-styles';
import type {
  CallReportStatus,
  CallReportUpdate,
  CallReportWithCustomer,
} from '@/lib/types/call-reports';

interface CallReportProgressTimelineProps {
  report: CallReportWithCustomer;
  updates: CallReportUpdate[];
}

type TimelineItem =
  | {
      kind: 'original';
      id: string;
      title: string;
      status: CallReportStatus;
      preview: string;
      report: CallReportWithCustomer;
    }
  | {
      kind: 'update';
      id: string;
      title: string;
      status: CallReportStatus;
      preview: string;
      update: CallReportUpdate;
    };

function truncatePreview(text: string | null | undefined, max = 80): string {
  const trimmed = text?.trim() ?? '';
  if (!trimmed) return 'No details recorded.';
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trim()}…`;
}

export function CallReportProgressTimeline({ report, updates }: CallReportProgressTimelineProps) {
  const [selected, setSelected] = useState<TimelineItem | null>(null);

  const items = useMemo((): TimelineItem[] => {
    const original: TimelineItem = {
      kind: 'original',
      id: 'original',
      title: 'Original visit',
      status: report.status,
      preview: truncatePreview(report.summary || report.topic),
      report,
    };

    const chronUpdates = [...updates].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const updateItems: TimelineItem[] = chronUpdates.map((update, index) => ({
      kind: 'update',
      id: update.id,
      title: `Update ${index + 1}`,
      status: update.status,
      preview: truncatePreview(update.note),
      update,
    }));

    return [original, ...updateItems];
  }, [report, updates]);

  const latestId = items.length > 0 ? items[items.length - 1].id : null;

  return (
    <>
      <CardWrap>
        <ol className="relative space-y-0">
          {items.map((item, index) => {
            const styles = getCallReportStatusStyles(item.status);
            const isLatest = item.id === latestId;
            const isLast = index === items.length - 1;
            const lineStyles =
              index < items.length - 1
                ? getCallReportStatusStyles(items[index + 1].status)
                : styles;

            return (
              <li key={item.id} className="relative flex gap-4 pb-8 last:pb-0">
                <div className="flex flex-col items-center shrink-0 w-6">
                  <span
                    className={cn(
                      'relative z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 bg-background',
                      styles.dotClass,
                      isLatest && cn('h-5 w-5 ring-4', styles.ringClass)
                    )}
                    aria-hidden
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full bg-white', isLatest && 'h-2 w-2')} />
                  </span>
                  {!isLast && (
                    <span
                      className={cn('mt-1 w-0.5 flex-1 min-h-[2rem]', lineStyles.lineClass, 'opacity-70')}
                      aria-hidden
                    />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  className={cn(
                    'flex-1 text-left rounded-lg border border-transparent px-3 py-2 -ml-1 transition-colors',
                    'hover:bg-muted/60 hover:border-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{item.title}</span>
                    <Badge variant="outline" className={cn('text-xs font-normal', styles.badgeClass)}>
                      {item.status}
                    </Badge>
                    {isLatest && (
                      <Badge variant="secondary" className="text-xs">
                        Latest
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {item.kind === 'original'
                      ? formatDate(item.report.report_date)
                      : formatTimestamp(item.update.created_at)}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{item.preview}</p>
                  <p className="text-xs text-primary/80 mt-2">Click to view details</p>
                </button>
              </li>
            );
          })}
        </ol>
      </CardWrap>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          {selected?.kind === 'original' && (
            <>
              <DialogHeader>
                <DialogTitle>Original visit</DialogTitle>
                <DialogDescription>{formatDate(selected.report.report_date)}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <DetailRow label="Status" value={selected.report.status} />
                <DetailBlock label="Summary" value={selected.report.summary} />
                <DetailBlock label="Customer feedback" value={selected.report.customer_feedback} />
                {selected.report.next_action && (
                  <DetailBlock label="Next action (at visit)" value={selected.report.next_action} />
                )}
              </div>
            </>
          )}
          {selected?.kind === 'update' && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>{formatTimestamp(selected.update.created_at)}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <DetailRow label="Status" value={selected.update.status} />
                <DetailBlock label="Note" value={selected.update.note} />
                {selected.update.next_action && (
                  <DetailBlock label="Next action" value={selected.update.next_action} />
                )}
                {selected.update.next_follow_up_date && (
                  <DetailRow
                    label="Next follow-up"
                    value={formatDate(selected.update.next_follow_up_date)}
                  />
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CardWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">{children}</div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground font-medium">{label}</p>
      <p className="mt-1">{value}</p>
    </div>
  );
}

function DetailBlock({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-muted-foreground font-medium">{label}</p>
      <p className="mt-1 whitespace-pre-wrap">{value?.trim() || '—'}</p>
    </div>
  );
}
