import { useState } from 'react'
import {
  Archive,
  Flame,
  Leaf,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { streakStats } from '../domain.js'
import { scheduleLabel } from '../utils/habitOptions.js'
import EmptyState from '../components/common/EmptyState.jsx'
import PageHeading from '../components/common/PageHeading.jsx'

export default function HabitsPage({
  habits,
  occurrences,
  onAdd,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}) {
  const [showArchived, setShowArchived] = useState(false)
  const visible = habits.filter((habit) => showArchived || !habit.archived)

  return (
    <>
      <PageHeading
        eyebrow="YOUR ROUTINES"
        title="Habits"
        subtitle="Make room for the things you want to keep doing."
        action={
          <button className="button button-primary" onClick={onAdd}>
            <Plus size={17} />
            New habit
          </button>
        }
      />
      <div className="toolbar-row">
        <span className="toolbar-count">
          {habits.filter((habit) => !habit.archived).length} active habits
        </span>
        <button
          className="text-button"
          onClick={() => setShowArchived((value) => !value)}
        >
          {showArchived ? 'Hide archived' : 'Show archived'}
        </button>
      </div>
      <div className="habit-management-list">
        {visible.length ? (
          visible.map((habit) => {
            const stats = streakStats(habit, occurrences)
            return (
              <article
                className={`manage-habit ${habit.archived ? 'archived' : ''}`}
                key={habit.id}
              >
                <span className="manage-emoji">{habit.icon}</span>
                <div className="manage-main">
                  <div className="manage-title">
                    <h2>{habit.name}</h2>
                    {habit.archived && (
                      <span className="archived-pill">Archived</span>
                    )}
                  </div>
                  <p>
                    {habit.description ||
                      `${habit.category} · ${scheduleLabel(habit.schedule)}`}
                  </p>
                </div>
                <div className="habit-metric">
                  <strong>
                    <Flame size={15} />
                    {stats.current}
                  </strong>
                  <span>current streak</span>
                </div>
                <div className="habit-metric">
                  <strong>
                    {stats.rate === null ? '—' : `${stats.rate}%`}
                  </strong>
                  <span>completion</span>
                </div>
                <div className="habit-actions">
                  <button
                    className="icon-button"
                    onClick={() => onEdit(habit)}
                    aria-label={`Edit ${habit.name}`}
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  {habit.archived ? (
                    <>
                      <button
                        className="icon-button"
                        onClick={() => onRestore(habit)}
                        aria-label={`Restore ${habit.name}`}
                        title="Restore"
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button
                        className="icon-button danger-icon"
                        onClick={() => onDelete(habit)}
                        aria-label={`Delete ${habit.name}`}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  ) : (
                    <button
                      className="icon-button"
                      onClick={() => onArchive(habit)}
                      aria-label={`Archive ${habit.name}`}
                      title="Archive"
                    >
                      <Archive size={16} />
                    </button>
                  )}
                </div>
              </article>
            )
          })
        ) : (
          <EmptyState
            icon={Leaf}
            title="No habits here yet"
            detail="A good routine starts small. Add one thing you want to practice."
            action={
              <button className="button button-primary" onClick={onAdd}>
                <Plus size={16} />
                Create a habit
              </button>
            }
          />
        )}
      </div>
    </>
  )
}
