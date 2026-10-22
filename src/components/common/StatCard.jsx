export default function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  accent,
  progress,
}) {
  return (
    <article className={`stat-card accent-${accent}`}>
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">
          <Icon size={17} />
        </span>
      </div>
      <strong>{value}</strong>
      <span className="stat-detail">{detail}</span>
      {progress !== undefined && (
        <div className="stat-progress">
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
    </article>
  )
}
