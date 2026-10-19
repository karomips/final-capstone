import React, { useEffect, useId, useRef } from 'react';
import { LogOut, X } from 'lucide-react';
import './SignOutDialog.css';

function SignOutDialog({ onClose, onConfirm }) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector('button')?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);

  return (
    <div className="signout-dialog-overlay" onClick={onClose}>
      <section
        className="signout-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="signout-dialog-top">
          <span className="signout-dialog-icon"><LogOut size={23} aria-hidden="true" /></span>
          <button type="button" className="signout-dialog-close" onClick={onClose} aria-label="Close sign out dialog">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <h2 id={titleId}>Sign out of EasyDrive?</h2>
        <p id={descriptionId}>You can sign in again whenever you&apos;re ready to return to your workspace.</p>
        <div className="signout-dialog-actions">
          <button type="button" className="signout-dialog-cancel" onClick={onClose}>Cancel</button>
          <button type="button" className="signout-dialog-confirm" onClick={onConfirm}>Sign out</button>
        </div>
      </section>
    </div>
  );
}

export default SignOutDialog;
