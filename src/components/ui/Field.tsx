import type { InputHTMLAttributes } from 'react';

export function Field({ label, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-muted">{label}</span>
      <input
        {...props}
        className={`min-h-12 w-full rounded-xl border border-line bg-cream px-3 text-base outline-none focus:border-sage focus:ring-2 focus:ring-sage/25 ${className}`}
      />
    </label>
  );
}
