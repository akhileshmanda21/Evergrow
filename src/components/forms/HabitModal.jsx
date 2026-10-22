import { useState } from 'react'
import { X } from 'lucide-react'
import {
  HABIT_CATEGORIES,
  HABIT_ICONS,
  WEEKDAYS,
} from '../../utils/habitOptions.js'
import useDialogFocus from '../../hooks/useDialogFocus.js'

export default function HabitModal({ habit, onClose, onSave }) {
  const dialogRef = useDialogFocus(onClose)
  const [name, setName] = useState(habit?.name ?? '')
  const [description, setDescription] = useState(habit?.description ?? '')
  const [category, setCategory] = useState(
    habit?.category ?? HABIT_CATEGORIES[0],
  )
  const [icon, setIcon] = useState(habit?.icon ?? HABIT_ICONS[0])
  const [scheduleType, setScheduleType] = useState(
    habit?.schedule?.type ?? 'daily',
  )
  const [days, setDays] = useState(
    (habit?.schedule?.days ?? []).map((day) => WEEKDAYS[day]),
  )
  const [reminder, setReminder] = useState(habit?.reminder ?? '')
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    if (name.trim().length < 2)
      return setError('Use at least 2 characters for the habit name.')
    if (scheduleType === 'custom' && !days.length)
      return setError('Choose at least one day for a custom schedule.')
    onSave({
      id: habit?.id,
      name,
      description,
      category,
      icon,
      scheduleType,
      days,
      reminder,
      startDate: habit?.startDate,
    })
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
        className="form-modal"
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="habit-modal-title"
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
        <p className="eyebrow">A ROUTINE TO RETURN TO</p>
        <h2 id="habit-modal-title">
          {habit ? 'Edit habit' : 'Create a habit'}
        </h2>
        <label className="field-label">
          Name
          <input
            maxLength={60}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Read a few pages"
          />
        </label>
        <label className="field-label">
          Description <span>Optional</span>
          <textarea
            maxLength={180}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Make it easy to remember why this matters."
            rows={2}
          />
        </label>
        <div className="field-row">
          <label className="field-label">
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {HABIT_CATEGORIES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Reminder <span>Optional</span>
            <input
              type="time"
              value={reminder}
              onChange={(event) => setReminder(event.target.value)}
            />
          </label>
        </div>
        <div className="field-label">
          Choose an icon
          <div className="icon-choices">
            {HABIT_ICONS.map((item) => (
              <button
                type="button"
                key={item}
                className={icon === item ? 'chosen' : ''}
                onClick={() => setIcon(item)}
                aria-label={`Choose ${item}`}
                aria-pressed={icon === item}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <fieldset className="schedule-field">
          <legend>Schedule</legend>
          <div className="schedule-options">
            {[
              ['daily', 'Every day'],
              ['weekdays', 'Weekdays'],
              ['custom', 'Choose days'],
            ].map(([value, label]) => (
              <label
                key={value}
                className={scheduleType === value ? 'selected' : ''}
              >
                <input
                  type="radio"
                  name="schedule"
                  value={value}
                  checked={scheduleType === value}
                  onChange={() => setScheduleType(value)}
                />
                {label}
              </label>
            ))}
          </div>
          {scheduleType === 'custom' && (
            <div className="weekday-choices">
              {WEEKDAYS.map((day) => (
                <button
                  type="button"
                  key={day}
                  className={days.includes(day) ? 'chosen' : ''}
                  onClick={() =>
                    setDays((current) =>
                      current.includes(day)
                        ? current.filter((item) => item !== day)
                        : [...current, day],
                    )
                  }
                  aria-pressed={days.includes(day)}
                >
                  {day.slice(0, 1)}
                </button>
              ))}
            </div>
          )}
        </fieldset>
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
            {habit ? 'Save changes' : 'Create habit'}
          </button>
        </div>
      </form>
    </div>
  )
}
