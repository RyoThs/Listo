import { Check } from 'lucide-react';
import { LIST_COLORS } from '../../lib/listIcons';

/** Les pastilles de couleur (listes, cartes de fidélité). */
export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-muted">Couleur</span>
      <div className="flex flex-wrap gap-2.5">
        {LIST_COLORS.map((c) => (
          <button type="button" key={c} onClick={() => onChange(c)} aria-label={`Couleur ${c}`} aria-pressed={value === c}
            className="flex size-10 items-center justify-center rounded-full ring-offset-2 aria-pressed:ring-2 aria-pressed:ring-ink" style={{ background: c }}>
            {value === c && <Check size={18} className="text-white" />}
          </button>
        ))}
      </div>
    </div>
  );
}
