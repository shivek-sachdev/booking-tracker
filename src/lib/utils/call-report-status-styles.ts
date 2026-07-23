import type { CallReportStatus } from '@/lib/types/call-reports';

interface CallReportStatusStyles {
  dotClass: string;
  lineClass: string;
  ringClass: string;
  badgeClass: string;
}

const STATUS_STYLES: Record<CallReportStatus, CallReportStatusStyles> = {
  'Follow Up': {
    dotClass: 'bg-blue-600 border-blue-600',
    lineClass: 'bg-blue-600',
    ringClass: 'ring-blue-600/30',
    badgeClass: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-200',
  },
  Confirmed: {
    dotClass: 'bg-emerald-600 border-emerald-600',
    lineClass: 'bg-emerald-600',
    ringClass: 'ring-emerald-600/30',
    badgeClass:
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200',
  },
  Closed: {
    dotClass: 'bg-slate-500 border-slate-500',
    lineClass: 'bg-slate-400',
    ringClass: 'ring-slate-500/30',
    badgeClass: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
  },
  'No Action': {
    dotClass: 'bg-muted-foreground/50 border-muted-foreground/50',
    lineClass: 'bg-muted-foreground/30',
    ringClass: 'ring-muted-foreground/20',
    badgeClass: 'border-border bg-muted text-muted-foreground',
  },
};

export function getCallReportStatusStyles(status: CallReportStatus): CallReportStatusStyles {
  return STATUS_STYLES[status] ?? STATUS_STYLES['Follow Up'];
}
