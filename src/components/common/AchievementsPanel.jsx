import { Award, Check } from 'lucide-react'

export default function AchievementsPanel({ achievements }) {
  const earned = achievements.filter((item) => item.earned)

  return (
    <section className="panel achievements-panel">
      <div className="panel-heading compact">
        <div>
          <h2>Milestones</h2>
          <p>
            {earned.length} of {achievements.length} reached
          </p>
        </div>
        <Award size={17} className="muted-icon" />
      </div>
      <div className="achievement-list">
        {achievements.map((item) => (
          <div
            className={`achievement-row ${item.earned ? 'earned' : ''}`}
            key={item.id}
          >
            <span className="achievement-icon">
              {item.earned ? <Check size={13} /> : <Award size={13} />}
            </span>
            <div>
              <strong>{item.title}</strong>
              <small>{item.earned ? 'Reached' : item.detail}</small>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
