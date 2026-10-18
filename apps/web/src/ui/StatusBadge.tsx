import { CircleCheck, CloudUpload, CircleAlert, WifiOff, Clock } from 'lucide-react';
import type { SyncStatus } from '@fin/contracts';
import styles from './StatusBadge.module.css';

export interface StatusBadgeProps { status: SyncStatus }
export function StatusBadge({ status }: StatusBadgeProps) {
  const pending = `${status.pending} ${status.pending === 1 ? 'pendiente' : 'pendientes'}`;
  let text: string; let tone = styles.neutral; let Icon = Clock;
  if (status.rejected > 0) { text = `${status.rejected} ${status.rejected === 1 ? 'cambio requiere' : 'cambios requieren'} revisión`; tone = styles.error; Icon = CircleAlert; }
  else if (!status.hydrated && status.mode === 'error') { text = 'No se pudieron preparar los datos · intentá de nuevo'; tone = styles.error; Icon = CircleAlert; }
  else if (!status.hydrated) text = 'Preparando datos…';
  else if (!status.durable) { text = 'Guardado local no disponible'; tone = styles.error; Icon = CircleAlert; }
  else if (status.mode === 'error') { text = 'No se pudo sincronizar · revisá la conexión'; tone = styles.error; Icon = CircleAlert; }
  else if (status.mode === 'syncing') { text = status.pending ? `Enviando… · ${pending}` : 'Comprobando sincronización…'; Icon = CloudUpload; }
  else if (status.pending > 0) { text = `Guardado en este dispositivo · ${pending}`; Icon = status.mode === 'offline' ? WifiOff : Clock; }
  else if (status.mode === 'offline') { text = 'Sin conexión'; Icon = WifiOff; }
  else if (!status.lastSyncedAt) text = 'Sin confirmación remota';
  else { text = 'Sincronizado'; tone = styles.success; Icon = CircleCheck; }
  return <span role="status" className={`${styles.badge} ${tone}`}><Icon size={16} aria-hidden="true" /><span>{text}</span></span>;
}
