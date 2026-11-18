import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RotateCcw, TriangleAlert } from 'lucide-react';
import { reportError } from '../lib/errors';

interface Props {
  /** Nom de la partie protégée, affiché si elle plante (« Mes cartes de fidélité »). */
  name: string;
  /** « section » : petit encadré, le reste de l'écran marche. « screen » : écran entier. */
  variant?: 'section' | 'screen';
  /** Ce qu'on fait en plus quand on touche « Réessayer » (ex. revenir à l'accueil). */
  onReset?: () => void;
  children: ReactNode;
}

/**
 * Cloison anti-panne : si une partie de l'écran plante, SEULE cette partie
 * est remplacée par un message avec « Réessayer ». Tout le reste continue de marcher.
 * Les données ne sont jamais touchées : elles restent dans le téléphone.
 */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, this.props.name);
    if (info.componentStack) console.error(info.componentStack);
  }

  reset = () => {
    this.props.onReset?.();
    this.setState({ failed: false });
  };

  render() {
    if (!this.state.failed) return this.props.children;
    if (this.props.variant === 'screen') return <ScreenFallback onRetry={this.reset} />;
    return (
      <div role="alert" className="my-2 flex items-center gap-3 rounded-2xl border border-[#E8C9C4] bg-[#FBF1EF] p-3 text-[15px]">
        <TriangleAlert size={20} className="shrink-0 text-danger" />
        <span className="min-w-0 flex-1">« {this.props.name} » n'a pas pu s'afficher.</span>
        <button onClick={this.reset} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-card px-3 text-sm font-semibold text-sage-dark">
          <RotateCcw size={16} /> Réessayer
        </button>
      </div>
    );
  }
}

function ScreenFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="pt-safe mx-auto flex min-h-full max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <TriangleAlert size={40} className="text-danger" />
      <h1 className="text-xl font-bold">Un petit souci d'affichage</h1>
      <p className="text-muted">Tes listes et tes cartes sont en sécurité dans le téléphone.</p>
      <div className="grid w-full gap-2">
        <button onClick={onRetry} className="min-h-12 rounded-xl bg-sage font-semibold text-white">Réessayer</button>
        <button onClick={() => location.reload()} className="min-h-12 rounded-xl border border-line bg-card font-semibold">Recharger l'appli</button>
      </div>
    </div>
  );
}
