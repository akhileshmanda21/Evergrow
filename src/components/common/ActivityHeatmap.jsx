import { addDays, format, startOfWeek, subDays } from 'date-fns'
import {
  getOccurrenceStatus,
  isHabitActiveOn,
  isScheduled,
  localDateKey,
} from '../../domain.js'

const today = () => new Date()
const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function ActivityHeatmap({
  habits,
  occurrences,
  weekStartsOn = 1,
}) {
  const currentDate = today()
  const currentKey = localDateKey(currentDate)
  const firstDate = startOfWeek(subDays(currentDate, 77), { weekStartsOn })
  const days = Array.from({ length: 84 }, (_, index) =>
    addDays(firstDate, index),
  )
  const weekdayLabels = Array.from(
    { length: 7 },
    (_, index) => weekdayNames[(weekStartsOn + index) % 7],
  )

  const cells = days.map((date) => {
    const dateKey = localDateKey(date)
    const future = dateKey > currentKey
    const scheduled = future
      ? []
      : habits.filter(
          (habit) => isHabitActiveOn(habit, date) && isScheduled(habit, date),
        )
    const completed = scheduled.filter(
      (habit) =>
        getOccurrenceStatus(occurrences, habit.id, dateKey) === 'completed',
    ).length
    const eligible = scheduled.filter(
      (habit) =>
        getOccurrenceStatus(occurrences, habit.id, dateKey) !== 'skipped',
    ).length
    const rate = eligible > 0 ? completed / eligible : 0
    const level =
      future || eligible === 0
        ? 0
        : completed === 0
          ? 1
          : rate < 0.5
            ? 2
            : rate < 1
              ? 3
              : 4
    const description = future
      ? 'Upcoming'
      : scheduled.length === 0
        ? 'No habits scheduled'
        : `${completed} of ${eligible} eligible habits completed`

    return { date, dateKey, completed, description, future, level }
  })
  const hasHistory = cells.some((cell) => cell.completed > 0)

  return (
    <section className="panel heatmap-panel" aria-labelledby="heatmap-title">
      <div className="heatmap-header">
        <div>
          <h2 id="heatmap-title">Activity over 12 weeks</h2>
          <p>Daily completions from your saved habit records</p>
        </div>
        <div
          className="heatmap-legend"
          aria-label="Activity intensity: none to all completed"
        >
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <i className={`heatmap-cell level-${level}`} key={level} />
          ))}
          <span>More</span>
        </div>
      </div>
      {hasHistory ? (
        <div className="heatmap-body">
          <div className="heatmap-weekdays" aria-hidden="true">
            {weekdayLabels.map((label) => (
              <span key={label}>{label.slice(0, 1)}</span>
            ))}
          </div>
          <div className="heatmap-grid">
            {cells.map(({ date, dateKey, description, future, level }) => (
              <span
                role="img"
                className={`heatmap-cell level-${level}`}
                key={dateKey}
                title={`${format(date, 'MMM d, yyyy')}: ${description}`}
                aria-label={`${format(date, 'EEEE, MMMM d')}: ${description}`}
                aria-hidden={future ? 'true' : undefined}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="heatmap-empty" role="status">
          <strong>
            {habits.length
              ? 'Your activity will appear here'
              : 'Start with a habit'}
          </strong>
          <span>
            {habits.length
              ? 'Complete a scheduled habit to begin your 12-week activity history.'
              : 'Add a habit, then complete a scheduled check-in to build your activity history.'}
          </span>
        </div>
      )}
    </section>
  )
}
