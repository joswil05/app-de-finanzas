import { useState, type FormEvent } from 'react';
import { parseMoney } from '@fin/domain';
import { LocalDateSchema } from '@fin/contracts';
import { AccessFrame } from '../auth/AccessFrame';
import { authError } from '../auth/errors';
import type { SessionController } from '../auth/session';
import { finishSetup, initialDraft, type SetupDraft } from './setup';
import styles from '../auth/Access.module.css';
export function OnboardingPage({ controller }: { controller: SessionController }) {
  const uid = controller.getSnapshot().user!.uid;
  const [draft, setDraft] = useState(() => initialDraft(uid)); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  function change(patch: Partial<SetupDraft>) { const next = { ...draft, ...patch }; setDraft(next); localStorage.setItem(`finanzas-onboarding-v1:${uid}`, JSON.stringify(next)); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (draft.step < 3) {
      try {
        if (draft.step === 1) new Intl.DateTimeFormat('es-NI', { timeZone: draft.timezone });
        if (draft.step === 2) { if (parseMoney(draft.balance, draft.accountCurrency).minor < 0) throw new Error('El saldo inicial de efectivo o banco no puede ser negativo.'); LocalDateSchema.parse(draft.date); }
        change({ step: draft.step + 1 });
      } catch (cause) { setError(draft.step === 1 ? 'Revisá la zona horaria. Por ejemplo: America/Managua.' : authError(cause)); }
      return;
    }
    const data = new FormData(event.currentTarget);
    if (!controller.hasPin && data.get('pin') !== data.get('confirmPin')) { setError('Los PIN no coinciden.'); return; }
    setBusy(true); try { if (!controller.hasPin) await controller.setInitialPin(String(data.get('pin'))); await finishSetup(controller, draft); } catch (cause) { setError(authError(cause)); } finally { setBusy(false); }
  }
  return <AccessFrame title={draft.step === 1 ? 'Hagamos espacio para vos' : draft.step === 2 ? 'Tu primera cuenta' : 'Protegé la vista'} intro={draft.step === 1 ? 'C$ son córdobas y US$ son dólares. Tus registros mantienen su moneda.' : draft.step === 2 ? 'Anotá lo que tenés hoy. Este saldo inicial no cuenta como ingreso.' : 'Un PIN de 6 dígitos oculta tus datos en este dispositivo.'}>
    <p className={styles.step}>Paso {draft.step} de 3</p><form className={styles.form} onSubmit={(event) => void submit(event)}>
    {draft.step === 1 && <><label className={styles.field}>Cómo te llamás (opcional)<input value={draft.displayName} maxLength={200} autoComplete="given-name" onChange={(event) => change({ displayName: event.target.value })} /></label><label className={styles.field}>Moneda del resumen<select value={draft.summaryCurrency} onChange={(event) => change({ summaryCurrency: event.target.value as SetupDraft['summaryCurrency'] })}><option value="NIO">C$ · Córdobas</option><option value="USD">US$ · Dólares</option></select></label><label className={styles.field}>Zona horaria<input required value={draft.timezone} onChange={(event) => change({ timezone: event.target.value })} maxLength={100} /></label><p className={styles.hint}>{controller.getSnapshot().persistence === 'unavailable' ? 'Este navegador no pudo conservar el historial. Necesitás conexión para consultar tus datos; los cambios pendientes se identificarán por separado.' : 'Después de descargar tus datos, podrás consultarlos sin conexión. Cada cambio mostrará si está guardado en tu dispositivo o sincronizado.'}</p></>}
    {draft.step === 2 && <><label className={styles.field}>Nombre de la cuenta<input value={draft.accountName} required maxLength={200} placeholder="Por ejemplo, mi efectivo" onChange={(event) => change({ accountName: event.target.value, skipAccount: false })} /></label><label className={styles.field}>Tipo<select value={draft.accountKind} onChange={(event) => change({ accountKind: event.target.value as SetupDraft['accountKind'] })}><option value="cash">Efectivo</option><option value="bank">Cuenta bancaria</option></select></label><label className={styles.field}>Moneda de la cuenta<select value={draft.accountCurrency} onChange={(event) => change({ accountCurrency: event.target.value as SetupDraft['accountCurrency'] })}><option value="NIO">C$ · Córdobas</option><option value="USD">US$ · Dólares</option></select></label><label className={styles.field}>Saldo inicial<input inputMode="decimal" value={draft.balance} required maxLength={20} onChange={(event) => change({ balance: event.target.value })} /></label><label className={styles.field}>Fecha del saldo<input type="date" value={draft.date} required onChange={(event) => change({ date: event.target.value })} /></label><button type="button" className={styles.secondary} onClick={() => change({ skipAccount: true, step: 3 })}>Omitir primera cuenta</button></>}
    {draft.step === 3 && <>{controller.hasPin ? <p className={styles.notice}>Tu PIN ya está creado en este dispositivo.</p> : <><label className={styles.field}>PIN de 6 dígitos<input name="pin" type="password" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} autoComplete="new-password" required /></label><label className={styles.field}>Confirmar PIN<input name="confirmPin" type="password" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} autoComplete="new-password" required /></label></>}<p className={styles.hint}>Es un bloqueo de privacidad local. No cifra la base de datos. Podés recuperarlo confirmando tu identidad, sin borrar registros pendientes.</p><p className={styles.hint}>La vista se bloquea tras 2 minutos sin actividad.</p></>}
    {error && <p role="alert" className={styles.error}>{error}</p>}<button className={styles.button} disabled={busy}>{busy ? 'Confirmando configuración…' : draft.step === 3 ? 'Terminar configuración' : 'Continuar'}</button>{draft.step > 1 && <button type="button" className={styles.secondary} disabled={busy} onClick={() => change({ step: draft.step - 1 })}>Volver</button>}
    </form>
  </AccessFrame>;
}
