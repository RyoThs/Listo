/** Boutons « au choix » collés (Par rayon | A → Z | Mon ordre). Un seul est actif à la fois. */
export function Segmented<T extends string>({ options, value, onChange, className = '' }: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`grid gap-1 rounded-xl bg-cream p-1 ${className}`} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button type="button" key={o.id} onClick={() => onChange(o.id)} aria-pressed={value === o.id}
          className="min-h-10 rounded-lg px-2 text-sm font-medium text-muted aria-pressed:bg-card aria-pressed:text-ink aria-pressed:shadow-sm">
          {o.label}
        </button>
      ))}
    </div>
  );
}
