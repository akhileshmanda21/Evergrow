import { addDays, format, isSameDay, startOfWeek } from 'date-fns'
import { Check } from 'lucide-react'
import { localDateKey, summarizeDate } from '../../domain.js'

export default function WeekOverview({ habits, occurrences, weekStartsOn }) {
  const currentDate = new Date()
  const days = Array.from({ length: 7 }, (_, index) =>
    addDays(startOfWeek(currentDate, { weekStartsOn }), index),
  )

  return (
    <div className="week-overview">
      {days.map((date) => {
        const future = localDateKey(date) > localDateKey(currentDate)
        const info = future ? null : summarizeDate(habits, occurrences, date)
        const isCurrent = isSameDay(date, currentDate)

        return (
          <div
            className={`week-day ${isCurrent ? 'current' : ''}`}
            key={localDateKey(date)}
          >
            <span>{format(date, 'EEEEE')}</span>
            <div
              className={`week-dot ${info?.rate === 100 && info.eligible ? 'full' : info?.completed ? 'partial' : ''}`}
              title={`${format(date, 'EEEE, MMM d')}: ${future ? 'upcoming' : `${info.completed}/${info.eligible} completed`}`}
            >
              {info?.rate === 100 && info.eligible ? (
                <Check size={13} />
              ) : info?.completed || info?.eligible ? (
                <span />
              ) : (
                <i />
              )}
            </div>
            <small>
              {future || !info?.eligible
                ? '—'
                : `${info.completed}/${info.eligible}`}
            </small>
          </div>
        )
      })}
    </div>
  )
}
