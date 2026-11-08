import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';
const styles: Record<Variant, string> = {
  primary: 'bg-sage text-white active:bg-sage-dark',
  outline: 'border border-line bg-card text-ink active:bg-cream',
  ghost: 'text-ink active:bg-line/60',
  danger: 'bg-danger text-white active:opacity-90',
};

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-semibold transition disabled:opacity-40 ${styles[variant]} ${className}`}
    />
  );
}

export function IconButton({ label, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...props}
      aria-label={label}
      title={label}
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink transition active:bg-line/70 ${className}`}
    />
  );
}
