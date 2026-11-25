import { useEffect, useState } from 'react';
import { CloudUpload, CloudOff, UserRound } from 'lucide-react';
import { Field } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { ACCOUNT_EVENT, checkVerified, connect, currentAccount, deleteMyAccount, disconnect, lastCloudSave, lastSaveResult, resendVerification, resetPassword, saveNow } from '../../lib/account';
import { saveMessage } from '../../lib/cloudSync';
import { useUI } from '../../stores/ui';

// Haut de la fenêtre « Sauvegarde » : compte facultatif pour la sauvegarde automatique.

function ago(ts: number | null) {
  if (!ts) return 'pas encore';
  const min = Math.floor((Date.now() - ts) / 60_000);
  if (min < 1) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `il y a ${h} h` : `il y a ${Math.floor(h / 24)} j`;
}

function useAccount() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick((n) => n + 1);
    window.addEventListener(ACCOUNT_EVENT, on);
    return () => window.removeEventListener(ACCOUNT_EVENT, on);
  }, []);
  return currentAccount();
}

function ConnectForm() {
  const showToast = useUI((s) => s.showToast);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = async (mode: 'signin' | 'signup') => {
    setBusy(true); setMsg(null);
    try {
      const r = await connect(mode, email.trim(), password);
      const n = r ? r.lists + r.items + r.favorites + r.cards : 0;
      showToast(mode === 'signup' ? 'Compte créé : sauvegarde automatique activée ✓' : n ? `Connecté : ${r!.lists} liste(s) et ${r!.items} article(s) récupérés ✓` : 'Connecté : sauvegarde automatique activée ✓');
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Ça n’a pas marché' });
    } finally { setBusy(false); }
  };
  const forgot = async () => {
    if (!email.trim()) { setMsg({ ok: false, text: 'Écris d’abord ton e-mail' }); return; }
    setBusy(true); setMsg(null);
    try { await resetPassword(email.trim()); setMsg({ ok: true, text: 'E-mail envoyé : suis le lien pour choisir un nouveau mot de passe.' }); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Envoi impossible' }); }
    finally { setBusy(false); }
  };
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void run('signin'); }}>
      <Field label="E-mail" type="email" autoComplete="username" autoCapitalize="off" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Field label="Mot de passe (6 caractères minimum)" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {msg && <p role="status" className={`text-sm font-medium ${msg.ok ? 'text-sage-dark' : 'text-danger'}`}>{msg.text}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" disabled={busy || !email || !password} onClick={() => void run('signup')}>Créer mon compte</Button>
        <Button type="submit" disabled={busy || !email || !password}>Me connecter</Button>
      </div>
      <button type="button" onClick={() => void forgot()} className="min-h-11 w-full text-sm text-muted underline underline-offset-2">Mot de passe oublié ?</button>
    </form>
  );
}

function DeleteAccount() {
  const showToast = useUI((s) => s.showToast);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const run = async () => {
    if (!confirm) { setConfirm(true); return; }
    setError('');
    try { await deleteMyAccount(); showToast('Compte supprimé. Tes listes restent sur ce téléphone.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Ça n’a pas marché'); setConfirm(false); }
  };
  return (
    <>
      <Button variant={confirm ? 'danger' : 'danger-ghost'} className="w-full" onClick={() => void run()}>
        {confirm ? 'Toucher encore pour supprimer le compte' : 'Supprimer mon compte'}
      </Button>
      {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
    </>
  );
}

/** Comme Fluxe : encadré tant que l'adresse n'est pas vérifiée (la sauvegarde marche déjà). */
function VerifyEmailNotice({ email }: { email: string }) {
  const showToast = useUI((s) => s.showToast);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const act = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true); setMsg('');
    try { await fn(); if (done) setMsg(done); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Ça n’a pas marché'); }
    finally { setBusy(false); }
  };
  const check = () => act(async () => {
    if (await checkVerified()) showToast('Adresse vérifiée ✓');
    else throw new Error('Pas encore vérifiée : touche le lien dans l’e-mail, puis réessaie.');
  }, '');
  return (
    <div className="space-y-2 rounded-xl bg-[#FBF0DC] p-3 text-[#7A5512]">
      <p className="font-semibold">Adresse pas encore vérifiée</p>
      <p className="text-sm">Ouvre l’e-mail « Vérifie ton adresse » envoyé à {email} (regarde aussi dans les spams). La sauvegarde marche déjà ; la vérification sert pour « Mot de passe oublié ».</p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" disabled={busy} onClick={() => void act(resendVerification, 'E-mail renvoyé.')}>Renvoyer l’e-mail</Button>
        <Button variant="outline" disabled={busy} onClick={() => void check()}>C’est fait</Button>
      </div>
      {msg && <p role="status" className="text-sm font-medium">{msg}</p>}
    </div>
  );
}

function SaveNowButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = async () => {
    setBusy(true); setMsg(null);
    const r = await saveNow(true);
    setMsg(r ? saveMessage(r) : { ok: false, text: 'Une sauvegarde est déjà en cours : réessaie dans un instant.' });
    setBusy(false);
  };
  return (
    <>
      <Button variant="outline" className="w-full" disabled={busy} onClick={() => void run()}>{busy ? 'Sauvegarde…' : 'Sauvegarder maintenant'}</Button>
      {msg && <p role="status" className={`text-sm font-medium ${msg.ok ? 'text-sage-dark' : 'text-danger'}`}>{msg.text}</p>}
    </>
  );
}

export function AccountSection() {
  const account = useAccount();
  const [open, setOpen] = useState(false);
  if (account) {
    const r = lastSaveResult();
    const failed = r !== null && r !== 'sent' && r !== 'unchanged';
    return (
      <div className="space-y-2 rounded-2xl border border-line p-3">
        <p className={`flex items-center gap-2 font-semibold ${failed ? 'text-[#7A5512]' : 'text-sage-dark'}`}>
          {failed ? <CloudOff size={20} /> : <CloudUpload size={20} />} Sauvegarde automatique {failed ? 'en attente' : 'activée'}
        </p>
        <p className="text-sm text-muted">
          {failed && r ? saveMessage(r).text : `Dernière sauvegarde en ligne : ${ago(lastCloudSave())}.`}
          {' '}Compte : {account.email}
        </p>
        {account.verified === false && <VerifyEmailNotice email={account.email} />}
        <SaveNowButton />
        <Button variant="outline" className="w-full" onClick={disconnect}>Se déconnecter</Button>
        <DeleteAccount />
      </div>
    );
  }
  return (
    <div className="space-y-3 rounded-2xl border border-line p-3">
      <p className="flex items-center gap-2 font-semibold"><UserRound size={20} /> Sauvegarde automatique</p>
      <p className="text-sm text-muted">Avec un compte (facultatif), tes listes sont sauvegardées toutes seules en ligne. Nouveau téléphone : connecte-toi et tout revient.</p>
      {open ? <ConnectForm /> : <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>Créer un compte ou me connecter</Button>}
    </div>
  );
}
