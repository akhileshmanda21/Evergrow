import { format } from 'date-fns'
import { Heart, Plus, Sparkles, Trophy } from 'lucide-react'
import EmptyState from '../components/common/EmptyState.jsx'
import PageHeading from '../components/common/PageHeading.jsx'

export default function RewardsPage({
  rewards,
  redemptions,
  xp,
  onAdd,
  onRedeem,
}) {
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE SOMETHING FOR YOU"
        title="Rewards"
        subtitle="Turn steady effort into something you genuinely enjoy."
        action={
          <button className="button button-primary" onClick={onAdd}>
            <Plus size={17} />
            Add reward
          </button>
        }
      />
      <section className="reward-balance">
        <span className="reward-balance-icon">
          <Sparkles size={21} />
        </span>
        <div>
          <span>Available balance</span>
          <strong>
            {xp} <small>XP</small>
          </strong>
        </div>
        <span className="balance-note">
          Earn points by completing scheduled habits.
        </span>
      </section>
      <div className="section-title-row">
        <div>
          <h2>Your rewards</h2>
          <p>Personal treats, chosen by you.</p>
        </div>
      </div>
      {rewards.length ? (
        <div className="rewards-grid">
          {rewards.map((reward, index) => (
            <article className="reward-card" key={reward.id}>
              <div className={`reward-card-art art-${index % 4}`}>
                <Heart size={24} strokeWidth={1.5} />
              </div>
              <div className="reward-card-body">
                <span className="reward-cost">
                  <Sparkles size={14} />
                  {reward.cost} XP
                </span>
                <h3>{reward.name}</h3>
                <button
                  className="button button-secondary full-button"
                  onClick={() => onRedeem(reward)}
                  disabled={xp < reward.cost}
                >
                  {xp >= reward.cost
                    ? 'Redeem reward'
                    : `Need ${reward.cost - xp} more XP`}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Heart}
          title="What feels rewarding to you?"
          detail="Create personal rewards that make consistency feel worth celebrating."
          action={
            <button className="button button-secondary" onClick={onAdd}>
              <Plus size={16} />
              Create a reward
            </button>
          }
        />
      )}
      <section className="redemption-section">
        <div className="section-title-row">
          <div>
            <h2>Redemption history</h2>
            <p>Redemptions remain permanent even if past habits are edited.</p>
          </div>
        </div>
        {redemptions.length ? (
          <div className="redemption-list">
            {[...redemptions].reverse().map((item) => (
              <div className="redemption-row" key={item.id}>
                <span className="redemption-icon">
                  <Trophy size={17} />
                </span>
                <div>
                  <strong>{item.rewardName}</strong>
                  <small>
                    {format(new Date(item.date), 'MMM d, yyyy · h:mm a')}
                  </small>
                </div>
                <b>−{item.cost} XP</b>
              </div>
            ))}
          </div>
        ) : (
          <p className="subtle-empty">
            Your redeemed rewards will show up here.
          </p>
        )}
      </section>
    </>
  )
}
