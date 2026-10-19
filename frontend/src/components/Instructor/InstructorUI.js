import React, { useEffect, useId, useRef } from 'react';
import { Check, LogOut, X } from 'lucide-react';

export function SectionHeading({ icon: Icon, title, description, action }) {
  return (
    <div className="ins-section-heading">
      <div className="ins-section-title-group">
        {Icon && <span className="ins-section-icon"><Icon size={20} strokeWidth={1.8} aria-hidden="true" /></span>}
        <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, compact = false, action }) {
  return (
    <div className={`ins-empty ${compact ? 'ins-empty--compact' : ''}`}>
      <span className="ins-empty-icon"><Icon size={25} strokeWidth={1.5} aria-hidden="true" /></span>
      <h3>{title}</h3><p>{description}</p>{action}
    </div>
  );
}

export function ConfirmationDialog({ title, description, confirmLabel = 'Save changes', onClose, onConfirm, destructive = false }) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const DialogIcon = destructive ? LogOut : Check;

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector('button')?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key !== 'Tab') return;
      const controls = dialogRef.current?.querySelectorAll('button:not([disabled])');
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);

  return (
    <div className="ins-dialog-overlay" onClick={onClose}>
      <section className="ins-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} onClick={(event) => event.stopPropagation()}>
        <div className="ins-dialog-top">
          <span className={`ins-dialog-icon ${destructive ? 'ins-dialog-icon--danger' : ''}`}><DialogIcon size={23} aria-hidden="true" /></span>
          <button type="button" className="ins-icon-button" onClick={onClose} aria-label="Close confirmation"><X size={20} aria-hidden="true" /></button>
        </div>
        <h2 id={titleId}>{title}</h2><p id={descriptionId}>{description}</p>
        <div className="ins-dialog-actions">
          <button type="button" className="ins-button ins-button--secondary" onClick={onClose}>Cancel</button>
          <button type="button" className={`ins-button ${destructive ? 'ins-button--danger' : 'ins-button--primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}
