import { useState } from 'react';
import type { SessionController } from './session';
import { authError } from './errors';
import styles from './Access.module.css';
export function LogoutButton({ controller, allowExport = true }: { controller: SessionController; allowExport?: boolean }) {
  const [pending, setPending] = useState(false); const [exported, setExported] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function close(saved = false) { setBusy(true); setError(''); try { const revisions = await controller.pending(); if (revisions.length && !saved) { setPending(true); return; } await controller.logout(saved ? 'exported' : undefined); } catch (cause) { setError(authError(cause)); } finally { setBusy(false); } }
  async function download() {
    if (!allowExport || controller.getSnapshot().locked) { setError('Desbloqueá la vista o recuperá el PIN antes de exportar tus pendientes.'); return; }
    try { const revisions = await controller.pending(); const content = JSON.stringify({ format: 'finanzas-pending', version: 1, uid: controller.getSnapshot().user?.uid, exportedAt: new Date().toISOString(), revisions }, null, 2); const blob = new Blob([content], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'finanzas-pendientes.json'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); setExported(true); } catch (cause) { setError(authError(cause)); }
  }
  return <div className={styles.form}>{error && <p role="alert" className={styles.error}>{error}</p>}{pending ? <><p className={styles.hint}>{allowExport ? 'Tenés cambios sin sincronizar. Podés cancelar y esperar la sincronización, o guardar una copia de los pendientes antes de cerrar. Esta copia no es un respaldo completo.' : 'Tenés cambios sin sincronizar. Desbloqueá la vista o recuperá el PIN para guardarlos antes de cerrar sesión.'}</p>{allowExport && <button className={styles.secondary} disabled={busy} onClick={() => void download()}>Descargar pendientes</button>}{exported && <button className={styles.secondary} disabled={busy} onClick={() => void close(true)}>Ya guardé la copia; cerrar sesión</button>}<button className={styles.secondary} disabled={busy} onClick={() => { setPending(false); setExported(false); }}>Cancelar cierre</button></> : <button className={styles.secondary} disabled={busy} onClick={() => void close()}>Cerrar sesión</button>}</div>;
}
