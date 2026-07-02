'use client';

import type { CategoryHeaderSpan } from '@/lib/gradebook-columns.util';

type Props = {
  parentSpans: CategoryHeaderSpan[];
  subSpans: CategoryHeaderSpan[] | null;
  trailingEmptyCols?: number;
};

export function CategoryTableHeaderRows({
  parentSpans,
  subSpans,
  trailingEmptyCols = 0,
}: Props) {
  if (parentSpans.length === 0) return null;

  return (
    <>
      <tr>
        <th style={{ padding: '0.35rem 0.5rem' }} />
        {parentSpans.map((span, idx) => (
          <th
            key={`parent-${span.label}-${idx}`}
            colSpan={span.count}
            style={{
              padding: '0.35rem 0.5rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              textAlign: 'center',
              borderBottom: subSpans ? '1px solid #e2e8f0' : '1px solid #cbd5e1',
              background: span.kind === 'certificate' ? '#e0f2fe' : '#f1f5f9',
              color: '#1e293b',
            }}
          >
            {span.label}
          </th>
        ))}
        {trailingEmptyCols > 0 && <th style={{ padding: '0.35rem 0.5rem' }} />}
      </tr>
      {subSpans && (
        <tr>
          <th style={{ padding: '0.35rem 0.5rem' }} />
          {subSpans.map((span, idx) => (
            <th
              key={`sub-${span.label}-${idx}`}
              colSpan={span.count}
              style={{
                padding: '0.3rem 0.5rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                textAlign: 'center',
                borderBottom: '1px solid #cbd5e1',
                background: span.kind === 'certificate' ? '#f0f9ff' : '#f8fafc',
                color: '#475569',
              }}
            >
              {span.label || '\u00a0'}
            </th>
          ))}
          {trailingEmptyCols > 0 && <th style={{ padding: '0.35rem 0.5rem' }} />}
        </tr>
      )}
    </>
  );
}
