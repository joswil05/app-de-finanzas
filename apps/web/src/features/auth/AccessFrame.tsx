import type { ReactNode } from 'react';
import { Wallet } from 'lucide-react';
import styles from './Access.module.css';
export function AccessFrame({ title, children, intro }: { title: string; children: ReactNode; intro?: string }) {
  return <main className={styles.page}><section className={styles.card} aria-labelledby="access-title"><p className={styles.brand}><Wallet size={24} aria-hidden="true" />Finanzas personales</p><h1 className={styles.title} id="access-title">{title}</h1>{intro && <p className={styles.intro}>{intro}</p>}{children}</section></main>;
}
