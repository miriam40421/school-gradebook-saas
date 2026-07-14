import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type CardVariant = 'glass' | 'flat' | 'raised';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  /** @deprecated use variant="flat" */
  glass?: boolean;
};

const variantStyles: Record<CardVariant, string> = {
  glass:  'bg-surface border border-border shadow-elevation1',
  flat:   'bg-surface border border-border',
  raised: 'bg-surface border border-border shadow-elevation2 hover:shadow-elevation3',
};

export function Card({ className, variant, glass, ...props }: CardProps) {
  const resolved: CardVariant = variant ?? (glass === false ? 'flat' : 'glass');
  return (
    <div
      className={cn(
        'rounded-md p-5 transition-shadow duration-200',
        variantStyles[resolved],
        className,
      )}
      {...props}
    />
  );
}
