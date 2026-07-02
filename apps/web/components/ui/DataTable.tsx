import { type TableHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type DataTableProps = TableHTMLAttributes<HTMLTableElement> & {
  compact?: boolean;
};

export function DataTable({ className, compact, children, ...props }: DataTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-elevation1">
      <table
        className={cn(
          'ui-datatable w-full border-collapse text-sm',
          compact
            ? '[&_th]:px-2 [&_th]:py-1.5 [&_td]:px-2 [&_td]:py-1.5'
            : '[&_th]:px-4 [&_th]:py-3 [&_td]:px-4 [&_td]:py-3',
          '[&_th]:bg-surface-raised [&_th]:text-start [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-text-muted',
          '[&_td]:border-b [&_td]:border-slate-100 [&_td]:text-start',
          '[&_tbody_tr]:transition-colors [&_tbody_tr]:duration-150 [&_tbody_tr:last-child_td]:border-0 [&_tbody_tr:hover]:bg-primary/5',
          className,
        )}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}
