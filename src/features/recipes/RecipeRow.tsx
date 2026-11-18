import { ChevronRight } from 'lucide-react';

/** Une ligne de la liste des plats (catalogue ou en ligne). */
export function RecipeRow({ title, subtitle, emoji, image, onClick }: { title: string; subtitle?: string; emoji?: string; image?: string; onClick: () => void }) {
  return (
    <li>
      <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card p-2.5 text-left active:bg-cream">
        {image
          ? <img src={image} alt="" loading="lazy" className="size-12 shrink-0 rounded-xl bg-cream object-cover" />
          : <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-cream text-2xl">{emoji ?? '🍽️'}</span>}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{title}</span>
          {subtitle && <span className="block truncate text-xs text-muted">{subtitle}</span>}
        </span>
        <ChevronRight size={18} className="shrink-0 text-muted" />
      </button>
    </li>
  );
}
