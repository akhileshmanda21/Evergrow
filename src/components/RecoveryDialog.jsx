import { format } from 'date-fns'
import { RotateCcw, X } from 'lucide-react'
import useDialogFocus from '../hooks/useDialogFocus.js'

export default function RecoveryDialog({
  candidate,
  recoveryDays,
  onClose,
  onConfirm,
}) {
  const dialogRef = useDialogFocus(onClose, Boolean(candidate))
  if (!candidate) return null

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recovery-title"
        tabIndex={-1}
      >
        <button
          className="icon-button modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <div className="modal-icon mint">
          <RotateCcw size={20} />
        </div>
        <p className="eyebrow">MISSED OCCURRENCE</p>
        <h2 id="recovery-title">Recover {candidate.habit.name}?</h2>
        <p>
          This will mark{' '}
          {format(new Date(`${candidate.date}T12:00:00`), 'MMMM d')} complete,
          update your streak and completion history, and award XP once. Recovery
          is available for the previous {recoveryDays} calendar days.
        </p>
        <div className="modal-actions">
          <button className="button button-quiet" onClick={onClose}>
            Not now
          </button>
          <button className="button button-primary" onClick={onConfirm}>
            Confirm recovery
          </button>
        </div>
      </div>
    </div>
  )
}
