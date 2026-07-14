import { type TableHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type DataTableProps = TableHTMLAttributes<HTMLTableElement> & {
  compact?: boolean;
};

export function DataTable({ className, compact, children, ...props }: DataTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-surface shadow-elevation1">
      <table
        className={cn(
          'ui-datatable w-full border-collapse text-sm',
          compact
            ? '[&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2'
            : '[&_th]:px-4 [&_th]:py-3 [&_td]:px-4 [&_td]:py-3',
          '[&_th]:bg-surface-raised [&_th]:text-start [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-text-muted [&_th]:border-b [&_th]:border-border',
          '[&_td]:border-b [&_td]:border-border [&_td]:text-start',
          '[&_tbody_tr]:transition-colors [&_tbody_tr]:duration-100 [&_tbody_tr:last-child_td]:border-0 [&_tbody_tr:hover]:bg-surface-raised',
          className,
        )}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}
