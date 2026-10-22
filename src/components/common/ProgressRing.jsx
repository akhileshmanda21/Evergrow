const RADIUS = 25
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function ProgressRing({ completed, total, percentage }) {
  const hasOccurrences = total > 0
  const value = hasOccurrences ? Math.max(0, Math.min(100, percentage ?? 0)) : 0
  const offset = CIRCUMFERENCE * (1 - value / 100)
  const description = hasOccurrences
    ? `${value}% complete, ${completed} of ${total} scheduled habits`
    : 'No habits scheduled today'

  return (
    <svg
      className="progress-ring"
      viewBox="0 0 64 64"
      role="img"
      aria-label={description}
    >
      <circle className="progress-ring-track" cx="32" cy="32" r={RADIUS} />
      <circle
        className="progress-ring-value"
        cx="32"
        cy="32"
        r={RADIUS}
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
      />
      <text className="progress-ring-label" x="32" y="32">
        {hasOccurrences ? `${value}%` : '—'}
      </text>
    </svg>
  )
}
