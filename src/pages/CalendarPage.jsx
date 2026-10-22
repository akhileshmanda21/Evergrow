import { useState } from 'react'
import {
  addDays,
  endOfMonth,
  format,
  isSameDay,
  startOfMonth,
  subDays,
} from 'date-fns'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import {
  getOccurrenceStatus,
  isHabitActiveOn,
  isScheduled,
  localDateKey,
} from '../domain.js'
import { WEEKDAYS } from '../utils/habitOptions.js'
import PageHeading from '../components/common/PageHeading.jsx'

const today = () => new Date()

export default function CalendarPage({
  habits,
  occurrences,
  weekStartsOn,
  onSelect,
}) {
  const [month, setMonth] = useState(startOfMonth(today()))
  const firstDay = startOfMonth(month)
  const gridStart = subDays(
    firstDay,
    (firstDay.getDay() - weekStartsOn + 7) % 7,
  )
  const days = Array.from({ length: 42 }, (_, index) =>
    addDays(gridStart, index),
  )
  const calendarWeekdays = Array.from(
    { length: 7 },
    (_, index) => WEEKDAYS[(weekStartsOn + index) % 7],
  )

  return (
    <>
      <PageHeading
        eyebrow="YOUR HISTORY"
        title="Calendar"
        subtitle="A gentle view of your rhythm, not a scorecard."
      />
      <section className="panel calendar-panel">
        <div className="calendar-toolbar">
          <div>
            <h2>{format(month, 'MMMM yyyy')}</h2>
            <p>Choose a day to review its check-ins.</p>
          </div>
          <div className="calendar-nav">
            <button
              className="icon-button"
              aria-label="Previous month"
              onClick={() =>
                setMonth((value) => addDays(startOfMonth(value), -1))
              }
            >
              <ArrowLeft size={17} />
            </button>
            <button
              className="text-button"
              onClick={() => setMonth(startOfMonth(today()))}
            >
              Today
            </button>
            <button
              className="icon-button"
              aria-label="Next month"
              onClick={() =>
                setMonth(startOfMonth(addDays(endOfMonth(month), 1)))
              }
            >
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
        <div className="calendar-grid calendar-weekdays">
          {calendarWeekdays.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="calendar-grid">
          {days.map((day) => {
            const scheduled = habits.filter(
              (habit) => isHabitActiveOn(habit, day) && isScheduled(habit, day),
            )
            const completeCount = scheduled.filter(
              (habit) =>
                getOccurrenceStatus(
                  occurrences,
                  habit.id,
                  localDateKey(day),
                ) === 'completed',
            ).length
            const skippedCount = scheduled.filter(
              (habit) =>
                getOccurrenceStatus(
                  occurrences,
                  habit.id,
                  localDateKey(day),
                ) === 'skipped',
            ).length
            const past = localDateKey(day) < localDateKey(today())
            const stateClass =
              scheduled.length === 0
                ? 'nonscheduled'
                : completeCount === scheduled.length
                  ? 'day-complete'
                  : completeCount > 0
                    ? 'day-partial'
                    : past && skippedCount < scheduled.length
                      ? 'day-missed'
                      : 'day-neutral'

            return (
              <button
                key={localDateKey(day)}
                onClick={() => onSelect(day)}
                className={`calendar-cell ${stateClass} ${day.getMonth() !== month.getMonth() ? 'outside-month' : ''} ${isSameDay(day, today()) ? 'calendar-today' : ''}`}
                aria-label={`${format(day, 'MMMM d')}, ${completeCount} of ${scheduled.length} complete`}
              >
                <span>{format(day, 'd')}</span>
                {scheduled.length > 0 && <i className="calendar-indicator" />}
              </button>
            )
          })}
        </div>
        <div className="calendar-legend">
          <span>
            <i className="legend-dot complete" />
            Complete
          </span>
          <span>
            <i className="legend-dot partial" />
            In progress
          </span>
          <span>
            <i className="legend-dot missed" />
            Missed
          </span>
          <span>
            <i className="legend-dot none" />
            Not scheduled
          </span>
        </div>
      </section>
    </>
  )
}
