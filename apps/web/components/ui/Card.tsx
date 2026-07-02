import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type CardVariant = 'glass' | 'flat' | 'raised';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  /** @deprecated use variant="flat" */
  glass?: boolean;
};

const variantStyles: Record<CardVariant, string> = {
  glass:  'bg-white/82 backdrop-blur-glass border border-white/35 shadow-elevation2',
  flat:   'bg-surface border border-slate-100 shadow-elevation1',
  raised: 'bg-surface border border-slate-100 shadow-elevation3 hover:shadow-elevation4',
};

export function Card({ className, variant, glass, ...props }: CardProps) {
  const resolved: CardVariant = variant ?? (glass === false ? 'flat' : 'glass');
  return (
    <div
      className={cn(
        'rounded-xl p-5 transition-shadow duration-200',
        variantStyles[resolved],
        className,
      )}
      {...props}
    />
  );
}
