import { useState } from 'react'
import { addDays, format, subDays } from 'date-fns'
import { BarChart3, Flame, Target } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { streakStats, summarizeDate, summarizeRange } from '../domain.js'
import EmptyState from '../components/common/EmptyState.jsx'
import PageHeading from '../components/common/PageHeading.jsx'
import ActivityHeatmap from '../components/common/ActivityHeatmap.jsx'

const today = () => new Date()

export default function InsightsPage({
  habits,
  occurrences,
  weekStartsOn = 1,
}) {
  const [period, setPeriod] = useState(7)
  const chartData = Array.from({ length: period }, (_, index) => {
    const date = addDays(subDays(today(), period - 1), index)
    const summary = summarizeDate(habits, occurrences, date)
    return {
      label: format(date, 'EEE'),
      percentage: summary.rate ?? 0,
      count: summary.eligible
        ? `${summary.completed}/${summary.eligible}`
        : '—',
    }
  })
  const start = subDays(today(), period - 1)
  const totals = summarizeRange(habits, occurrences, start, today())
  const ranked = habits
    .map((habit) => ({ habit, ...streakStats(habit, occurrences) }))
    .sort((left, right) => (right.rate ?? -1) - (left.rate ?? -1))

  return (
    <>
      <PageHeading
        eyebrow="SLOW AND STEADY"
        title="Insights"
        subtitle="Patterns you can use, without turning progress into pressure."
      />
      <div className="insight-summary-row">
        <article className="insight-summary">
          <span>Completion rate</span>
          <strong>{totals.rate === null ? '—' : `${totals.rate}%`}</strong>
          <small>
            {totals.completed} of {totals.eligible} scheduled occurrences
          </small>
        </article>
        <article className="insight-summary">
          <span>Habit count</span>
          <strong>{habits.length}</strong>
          <small>Active routines</small>
        </article>
        <article className="insight-summary">
          <span>Most consistent</span>
          <strong>
            {ranked.find((item) => item.rate !== null)?.habit.name ?? '—'}
          </strong>
          <small>In the selected period</small>
        </article>
      </div>
      <section className="panel chart-panel">
        <div className="chart-header">
          <div>
            <h2>Completion trend</h2>
            <p>Completed scheduled habits each day</p>
          </div>
          <div className="segmented">
            <button
              className={period === 7 ? 'selected' : ''}
              onClick={() => setPeriod(7)}
            >
              7 days
            </button>
            <button
              className={period === 30 ? 'selected' : ''}
              onClick={() => setPeriod(30)}
            >
              30 days
            </button>
          </div>
        </div>
        {totals.eligible ? (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 12, right: 10, bottom: 0, left: -18 }}
              >
                <CartesianGrid
                  strokeDasharray="3 6"
                  vertical={false}
                  stroke="var(--line)"
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted)', fontSize: 11 }}
                  interval={period === 30 ? 4 : 0}
                />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted)', fontSize: 11 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  formatter={(value, _name, item) => [
                    `${value}% (${item.payload.count})`,
                    'Completion',
                  ]}
                  contentStyle={{
                    borderRadius: 8,
                    borderColor: 'var(--line)',
                    background: 'var(--surface)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="percentage"
                  stroke="var(--green)"
                  strokeWidth={2.5}
                  dot={{ fill: 'var(--green)', r: period === 7 ? 4 : 2 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            icon={BarChart3}
            title="Your trend will take shape"
            detail="Complete a few scheduled habits and your progress will appear here."
          />
        )}
      </section>
      <ActivityHeatmap
        habits={habits}
        occurrences={occurrences}
        weekStartsOn={weekStartsOn}
      />
      <section className="panel consistency-panel">
        <div className="panel-heading">
          <div>
            <h2>Habit consistency</h2>
            <p>Based on scheduled days, excluding excused occurrences.</p>
          </div>
          <Target size={17} className="muted-icon" />
        </div>
        {ranked.length ? (
          ranked.map(({ habit, current, best, rate, successes }) => (
            <div className="consistency-row" key={habit.id}>
              <span className="habit-emoji">{habit.icon}</span>
              <div className="consistency-name">
                <strong>{habit.name}</strong>
                <div className="mini-meter">
                  <span style={{ width: `${rate ?? 0}%` }} />
                </div>
              </div>
              <span>{rate === null ? '—' : `${rate}%`}</span>
              <small>{successes} days</small>
              <small>
                <Flame size={13} />
                {current}/{best}
              </small>
            </div>
          ))
        ) : (
          <p className="subtle-empty">
            Add habits to see personal consistency insights.
          </p>
        )}
      </section>
    </>
  )
}
