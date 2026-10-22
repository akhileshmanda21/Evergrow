import { addDays, format, subDays } from 'date-fns'
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CalendarDays,
  Check,
  CheckCheck,
  Flame,
  Leaf,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import {
  achievementMilestones,
  daysBetween,
  getOccurrenceStatus,
  isScheduled,
  localDateKey,
  streakStats,
} from '../domain.js'
import EmptyState from '../components/common/EmptyState.jsx'
import PageHeading from '../components/common/PageHeading.jsx'
import StatCard from '../components/common/StatCard.jsx'
import WeekOverview from '../components/common/WeekOverview.jsx'
import AchievementsPanel from '../components/common/AchievementsPanel.jsx'
import ProgressRing from '../components/common/ProgressRing.jsx'

const today = () => new Date()
const formatLongDate = (date) => format(date, 'EEEE, MMMM d')

export default function TodayPage({
  state,
  activeHabits,
  date,
  summary,
  xp,
  level,
  weekStartsOn,
  onAdd,
  onTrack,
  onDate,
  recoveryCandidates,
  onRecover,
}) {
  const key = localDateKey(date)
  const todayKey = localDateKey(today())
  const isToday = key === todayKey
  const scheduled = activeHabits.filter((habit) => isScheduled(habit, date))
  const completed = scheduled.filter(
    (habit) =>
      getOccurrenceStatus(state.occurrences, habit.id, key) === 'completed',
  )
  const maxCurrent = activeHabits.reduce(
    (max, habit) =>
      Math.max(max, streakStats(habit, state.occurrences).current),
    0,
  )
  const maxBest = activeHabits.reduce(
    (max, habit) => Math.max(max, streakStats(habit, state.occurrences).best),
    0,
  )
  const dailyRate = summary?.rate ?? null

  return (
    <>
      <PageHeading
        eyebrow={isToday ? formatLongDate(date).toUpperCase() : 'PAST CHECK-IN'}
        title={
          isToday ? 'A little progress, today.' : format(date, 'EEEE, MMMM d')
        }
        subtitle={
          isToday
            ? 'A steady rhythm is built one day at a time.'
            : 'Your history stays editable within the recovery window.'
        }
        action={
          <button className="button button-primary" onClick={onAdd}>
            <Plus size={17} />
            New habit
          </button>
        }
      />
      <div className="date-strip">
        <button
          className="icon-button"
          aria-label="Previous day"
          onClick={() => onDate(subDays(date, 1))}
        >
          <ArrowLeft size={17} />
        </button>
        <button className="date-current" onClick={() => onDate(today())}>
          <CalendarDays size={16} />
          {isToday ? 'Today' : format(date, 'MMM d, yyyy')}
        </button>
        <button
          className="icon-button"
          aria-label="Next day"
          onClick={() => onDate(addDays(date, 1))}
          disabled={isToday}
        >
          <ArrowRight size={17} />
        </button>
        <span className="date-hint">{format(date, 'EEEE')}</span>
      </div>
      <section className="stats-grid" aria-label="Your progress">
        <article className="daily-progress-card">
          <div className="daily-progress-copy">
            <span className="eyebrow">TODAY'S PROGRESS</span>
            <strong>
              {summary.completed} of {summary.eligible}
            </strong>
            <span>
              {summary.eligible
                ? `${dailyRate ?? 0}% complete`
                : 'No eligible habits'}
            </span>
            <span>Personal target: {state.settings.dailyTarget}%</span>
          </div>
          <ProgressRing
            completed={summary.completed}
            total={summary.eligible}
            percentage={dailyRate}
          />
        </article>
        <StatCard
          label="Current streak"
          value={`${maxCurrent} days`}
          detail="Across your habits"
          icon={Flame}
          accent="coral"
        />
        <StatCard
          label="Best streak"
          value={`${maxBest} days`}
          detail="Personal best"
          icon={Award}
          accent="gold"
        />
        <StatCard
          label="Level progress"
          value={`Level ${level.level}`}
          detail={`${level.current} / ${level.next} XP to next`}
          icon={Sparkles}
          accent="blue"
          progress={level.current}
        />
      </section>

      <div className="dashboard-grid">
        <section className="panel today-panel">
          <div className="panel-heading">
            <div>
              <h2>Your habits</h2>
              <p>
                {summary.scheduled
                  ? `${summary.completed} of ${summary.scheduled} complete`
                  : 'Nothing scheduled for today'}
              </p>
            </div>
            <span className="panel-date">{format(date, 'MMM d')}</span>
          </div>
          {scheduled.length ? (
            <div className="habit-checklist">
              {scheduled.map((habit) => {
                const status = getOccurrenceStatus(
                  state.occurrences,
                  habit.id,
                  key,
                )
                const dayGap = daysBetween(key, todayKey)
                const blocked =
                  dayGap < 0 || dayGap > state.settings.recoveryDays
                return (
                  <div className={`check-row ${status}`} key={habit.id}>
                    <span className="habit-emoji">{habit.icon}</span>
                    <div className="check-habit-copy">
                      <strong>{habit.name}</strong>
                      <span>
                        {habit.category}
                        {habit.reminder ? ` · ${habit.reminder}` : ''}
                      </span>
                    </div>
                    {status === 'skipped' && (
                      <span className="status-label">Excused</span>
                    )}
                    <button
                      className={`check-control ${status === 'completed' ? 'is-done' : ''}`}
                      disabled={blocked}
                      onClick={() =>
                        onTrack(
                          habit,
                          date,
                          status === 'completed' ? 'pending' : 'completed',
                        )
                      }
                      aria-label={`${status === 'completed' ? 'Undo completion of' : 'Complete'} ${habit.name}`}
                      title={
                        status === 'completed'
                          ? 'Undo check-in'
                          : 'Mark complete'
                      }
                    >
                      {status === 'completed' ? <Check size={17} /> : <span />}
                    </button>
                    <button
                      className="skip-control"
                      disabled={blocked}
                      onClick={() =>
                        onTrack(
                          habit,
                          date,
                          status === 'skipped' ? 'pending' : 'skipped',
                        )
                      }
                      aria-label={`${status === 'skipped' ? 'Undo excused status for' : 'Excuse'} ${habit.name}`}
                      title="Excuse today"
                    >
                      {status === 'skipped' ? (
                        <RotateCcw size={14} />
                      ) : (
                        <MoreHorizontal size={17} />
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={Leaf}
              title={
                activeHabits.length
                  ? 'A clear day'
                  : 'Start with one small habit'
              }
              detail={
                activeHabits.length
                  ? 'You have no habits scheduled for this day.'
                  : 'Add something you can return to, even on an ordinary day.'
              }
              action={
                !activeHabits.length && (
                  <button className="button button-secondary" onClick={onAdd}>
                    <Plus size={16} />
                    Add your first habit
                  </button>
                )
              }
            />
          )}
          {scheduled.length > 0 && completed.length === scheduled.length && (
            <div className="complete-banner">
              <CheckCheck size={17} />
              <span>Everything scheduled is done. Nice work.</span>
              <span className="bonus-tag">
                +{state.settings.dailyBonus} XP bonus
              </span>
            </div>
          )}
        </section>
        <div className="right-stack">
          <section className="level-panel">
            <div className="level-top">
              <span className="level-icon">
                <Sparkles size={19} />
              </span>
              <span className="level-kicker">YOUR MOMENTUM</span>
              <span className="level-number">LVL {level.level}</span>
            </div>
            <div className="level-total">
              {xp}
              <span> total XP</span>
            </div>
            <div className="level-meter">
              <span style={{ width: `${level.current}%` }} />
            </div>
            <div className="level-foot">
              <span>{level.current} XP</span>
              <span>
                {level.next - level.current} to level {level.level + 1}
              </span>
            </div>
          </section>
          <section className="panel recovery-panel">
            <div className="panel-heading compact">
              <div>
                <h2>Room to recover</h2>
                <p>Recent missed check-ins</p>
              </div>
              <RotateCcw size={17} className="muted-icon" />
            </div>
            {recoveryCandidates.length ? (
              <div className="recovery-list">
                {recoveryCandidates.slice(0, 3).map((candidate) => (
                  <div
                    className="recovery-row"
                    key={`${candidate.habit.id}-${candidate.date}`}
                  >
                    <span>{candidate.habit.icon}</span>
                    <div>
                      <strong>{candidate.habit.name}</strong>
                      <small>
                        {format(
                          new Date(`${candidate.date}T12:00:00`),
                          'EEE, MMM d',
                        )}
                      </small>
                    </div>
                    <button
                      className="recover-button"
                      onClick={() => onRecover(candidate)}
                    >
                      Review
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="recovery-empty">
                Nothing recent to recover. Keep showing up at your pace.
              </p>
            )}
          </section>
          <AchievementsPanel
            achievements={achievementMilestones(
              state.habits,
              state.occurrences,
            )}
          />
          <section className="quote-panel">
            <span className="quote-mark">“</span>
            <p>Consistency is a kindness you show your future self.</p>
            <span className="quote-line" />
          </section>
        </div>
      </div>
      <section className="weekly-strip panel">
        <div>
          <p className="eyebrow">THIS WEEK</p>
          <h2>A week of small wins</h2>
        </div>
        <WeekOverview
          habits={activeHabits}
          occurrences={state.occurrences}
          weekStartsOn={weekStartsOn}
        />
      </section>
    </>
  )
}
