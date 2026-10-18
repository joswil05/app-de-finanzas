import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';

const focusableSelector = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]';
function focusables(element: HTMLElement) {
  return Array.from(element.querySelectorAll<HTMLElement>('*')).filter((item) => item.matches(focusableSelector) && !item.closest('[hidden], [inert]'));
}

/** A single protected surface: focus cannot enter the background and is restored on close. */
export function ModalFrame({ labelledBy, describedBy, children, onEscape, fullScreen = false, initialFocus }: { labelledBy: string; describedBy?: string | undefined; children: ReactNode; onEscape: () => void; fullScreen?: boolean; initialFocus?: RefObject<HTMLElement | null> }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const escapeRef = useRef(onEscape);
  useEffect(() => { escapeRef.current = onEscape; }, [onEscape]);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = dialogRef.current;
    if (!frame) return;
    (initialFocus?.current ?? focusables(frame)[0] ?? frame).focus();
    function trap(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); escapeRef.current(); }
      if (event.key !== 'Tab' || !frame) return;
      const items = focusables(frame); const first = items[0]; const last = items.at(-1);
      if (!first || !last) { event.preventDefault(); frame.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !frame.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !frame.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    }
    function containFocus(event: FocusEvent) { if (frame && event.target instanceof Node && !frame.contains(event.target)) (focusables(frame)[0] ?? frame).focus(); }
    document.addEventListener('keydown', trap, true); document.addEventListener('focusin', containFocus);
    // Hide background surfaces from assistive technology as well as pointer/keyboard use.
    const background = Array.from(document.body.children).filter((element): element is HTMLElement => element instanceof HTMLElement && !element.contains(frame));
    const inertStates = background.map((element) => element.inert);
    background.forEach((element) => { element.inert = true; });
    return () => {
      document.removeEventListener('keydown', trap, true); document.removeEventListener('focusin', containFocus);
      background.forEach((element, index) => { element.inert = inertStates[index] ?? false; });
      document.body.style.overflow = previousOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [initialFocus]);
  return createPortal(<div className={styles.backdrop}><div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={labelledBy} aria-describedby={describedBy} tabIndex={-1} className={`${styles.panel} ${fullScreen ? styles.fullScreen : ''}`}>{children}</div></div>, document.body);
}
