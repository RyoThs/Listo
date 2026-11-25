import { useCallback, useEffect, useState } from 'react';
import { Sheet } from '../../components/ui/Sheet';
import { Field } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { COUNTER_FIREBASE, counterConfig } from '../../lib/counterConfig';
import {
  clearSession, isExpired, lastWeeks, loadSession, readWeeks, refreshSession, saveSession, signIn, totalOf,
  type AdminSession, type WeekTotal,
} from '../../lib/counterAdmin';

// Écran « Compteur » réservé à Yoann (comme Fluxe Suivi). Ouvert par 5 touchers sur le numéro de version,
// puis par le petit lien « Compteur » qui n'apparaît que sur un téléphone déjà connecté.

/** Projet à lire (le faux projet pendant les essais Playwright, sinon le vrai). */
const CFG = counterConfig(location.hostname) ?? COUNTER_FIREBASE;
const GOAL = 300; // étape 2 du plan de monétisation : environ 300 personnes par semaine
const doFetch: typeof fetch = (...a) => fetch(...a);
const shortDate = (w: string) => { const [, m, d] = w.split('-'); return `${d}/${m}`; };

function Login({ onDone }: { onDone: (s: AdminSession) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!CFG) return;
    setBusy(true); setError('');
    try {
      const s = await signIn(CFG, email.trim(), password, doFetch);
      saveSession(localStorage, s);
      onDone(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connexion impossible');
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="space-y-4 pb-2" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <p className="text-sm text-muted">Réservé au créateur de LISTO. Connecte-toi avec ton compte du projet Firebase.</p>
      <Field label="E-mail" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoCapitalize="off" />
      <Field label="Mot de passe" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy || !email || !password}>{busy ? 'Connexion…' : 'Se connecter'}</Button>
    </form>
  );
}

function Stats({ weeks }: { weeks: WeekTotal[] }) {
  const now = weeks[weeks.length - 1];
  const total = totalOf(now);
  const max = Math.max(1, ...weeks.map(totalOf));
  return (
    <div className="space-y-4 pb-2">
      <div className="rounded-2xl border border-line bg-cream p-4">
        <p className="text-sm text-muted">Cette semaine (depuis le lundi {shortDate(now.week)})</p>
        <p className="font-mono text-4xl font-bold" aria-label={`${total} personnes cette semaine`}>{total}</p>
        <p className="text-sm text-muted">personne{total > 1 ? 's' : ''} qui se sont servi de LISTO</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <span>iPhone : <b>{now.ios}</b></span><span>Android : <b>{now.android}</b></span>
          <span>Nouveaux : <b>{now.nouveaux}</b></span><span>Appli installée : <b>{now.installes}</b></span>
          {now.autre > 0 && <span>Autre : <b>{now.autre}</b></span>}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-muted">8 dernières semaines</p>
        <div className="flex h-28 items-end gap-1.5" role="list" aria-label="8 dernières semaines">
          {weeks.map((w) => (
            <div key={w.week} role="listitem" aria-label={`Semaine du ${shortDate(w.week)} : ${totalOf(w)}`} className="flex flex-1 flex-col items-center gap-1">
              <span className="font-mono text-[11px] text-muted">{totalOf(w)}</span>
              <div className="w-full rounded-t-md bg-sage" style={{ height: `${Math.max(2, (totalOf(w) / max) * 80)}px` }} />
              <span className="text-[10px] text-muted">{shortDate(w.week)}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1 text-sm text-muted">Objectif de l’étape 2 : {GOAL} personnes par semaine</p>
        <div className="h-3 overflow-hidden rounded-full bg-sage-soft">
          <div className="h-full rounded-full bg-sage" style={{ width: `${Math.min(100, (total / GOAL) * 100)}%` }} />
        </div>
        <p className="mt-1 text-right font-mono text-xs text-muted">{total} / {GOAL}</p>
      </div>
    </div>
  );
}

function CounterPanel({ onSessionChange }: { onSessionChange: (connected: boolean) => void }) {
  const [session, setSession] = useState<AdminSession | null>(() => loadSession(localStorage));
  const [weeks, setWeeks] = useState<WeekTotal[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async (s: AdminSession) => {
    if (!CFG) return;
    setError('');
    try {
      let cur = s;
      if (isExpired(cur)) { cur = await refreshSession(CFG, cur, doFetch); saveSession(localStorage, cur); setSession(cur); }
      setWeeks(await readWeeks(CFG, cur.idToken, lastWeeks(8), doFetch));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lecture impossible');
    }
  }, []);

  useEffect(() => { if (session) void load(session); }, [session, load]);

  if (!CFG) return <p className="pb-4 text-sm text-muted">Compteur pas encore configuré.</p>;
  if (!session) return <Login onDone={(s) => { setSession(s); onSessionChange(true); }} />;
  const logout = () => { clearSession(localStorage); setSession(null); setWeeks(null); onSessionChange(false); };
  return (
    <div className="space-y-3">
      {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
      {!weeks && !error && <p className="text-sm text-muted">Chargement…</p>}
      {weeks && <Stats weeks={weeks} />}
      <div className="flex gap-2 pb-2">
        <Button variant="outline" className="flex-1" onClick={() => void load(session)}>Actualiser</Button>
        <Button variant="danger-ghost" className="flex-1" onClick={logout}>Se déconnecter</Button>
      </div>
      <p className="pb-2 text-center text-xs text-muted">Connecté : {session.email}</p>
    </div>
  );
}

export function CounterSheet({ open, onClose, onSessionChange }: { open: boolean; onClose: () => void; onSessionChange: (connected: boolean) => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Compteur">
      <CounterPanel onSessionChange={onSessionChange} />
    </Sheet>
  );
}
