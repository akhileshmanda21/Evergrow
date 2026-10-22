export default function EmptyState({ icon: Icon, title, detail, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={21} />
      </span>
      <h3>{title}</h3>
      <p>{detail}</p>
      {action}
    </div>
  )
}
