import { useState } from 'react'
import { Heart, X } from 'lucide-react'
import useDialogFocus from '../../hooks/useDialogFocus.js'

export default function RewardModal({ onClose, onSave }) {
  const dialogRef = useDialogFocus(onClose)
  const [name, setName] = useState('')
  const [cost, setCost] = useState('50')
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    if (!name.trim()) return setError('Give your reward a name.')
    if (!Number.isInteger(Number(cost)) || Number(cost) < 1)
      return setError('Cost must be at least 1 XP.')
    onSave({ name, cost })
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <form
        ref={dialogRef}
        className="form-modal small-modal"
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reward-modal-title"
        tabIndex={-1}
      >
        <button
          type="button"
          className="icon-button modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <div className="modal-icon mint">
          <Heart size={19} />
        </div>
        <p className="eyebrow">A REASON TO CELEBRATE</p>
        <h2 id="reward-modal-title">Create a reward</h2>
        <label className="field-label">
          Reward name
          <input
            maxLength={60}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="A slow Sunday morning"
          />
        </label>
        <label className="field-label">
          XP cost
          <div className="number-setting wide">
            <input
              aria-label="XP cost"
              type="number"
              min="1"
              value={cost}
              onChange={(event) => setCost(event.target.value)}
            />
            <span>XP</span>
          </div>
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button
            type="button"
            className="button button-quiet"
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="submit" className="button button-primary">
            Add reward
          </button>
        </div>
      </form>
    </div>
  )
}
