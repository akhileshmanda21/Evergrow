import { describe, expect, it } from 'vitest'
import {
  completionRate, currentXp, isScheduled, levelForXp, listRecoveryCandidates, localDateKey,
  streakStats, summarizeDate,
} from './domain.js'

const habit = (overrides = {}) => ({
  id: 'h1', name: 'Read', startDate: '2026-10-18', schedule: { type: 'daily' }, ...overrides,
})
const occurrence = (date, status, habitId = 'h1') => ({ id: `${habitId}-${date}`, habitId, date, status })
const localDay = (key) => new Date(`${key}T12:00:00`)

describe('habit schedule and completion rules', () => {
  it('supports daily, weekdays, and selected weekday schedules', () => {
    expect(isScheduled(habit(), '2026-10-18')).toBe(true)
    expect(isScheduled(habit({ schedule: { type: 'weekdays' } }), '2026-10-18')).toBe(false)
    expect(isScheduled(habit({ schedule: { type: 'weekdays' } }), '2026-10-19')).toBe(true)
    expect(isScheduled(habit({ schedule: { type: 'custom', days: [1, 3] } }), '2026-10-21')).toBe(true)
    expect(isScheduled(habit({ schedule: { type: 'custom', days: [1, 3] } }), '2026-10-20')).toBe(false)
  })

  it('does not produce NaN when there are no eligible occurrences', () => {
    expect(completionRate(0, 0)).toBeNull()
    expect(summarizeDate([], [], localDay('2026-10-22')).rate).toBeNull()
  })

  it('uses scheduled occurrences as the denominator and excludes excused occurrences', () => {
    const habits = [habit(), habit({ id: 'h2', schedule: { type: 'weekdays' } })]
    const summary = summarizeDate(habits, [occurrence('2026-10-22', 'completed')], localDay('2026-10-22'))
    expect(summary).toEqual({ scheduled: 2, completed: 1, eligible: 2, rate: 50 })
    const excused = summarizeDate([habit()], [occurrence('2026-10-22', 'skipped')], localDay('2026-10-22'))
    expect(excused).toEqual({ scheduled: 1, completed: 0, eligible: 0, rate: null })
  })

  it('keeps skipped days out of a streak but breaks on missed scheduled days', () => {
    const routine = habit({ startDate: '2026-10-19' })
    const occurrences = [
      occurrence('2026-10-19', 'completed'),
      occurrence('2026-10-20', 'skipped'),
      occurrence('2026-10-21', 'completed'),
      occurrence('2026-10-22', 'completed'),
    ]
    expect(streakStats(routine, occurrences, localDay('2026-10-22')).current).toBe(3)
    expect(streakStats(routine, [occurrence('2026-10-19', 'completed'), occurrence('2026-10-21', 'completed')], localDay('2026-10-22')).current).toBe(1)
  })

  it('counts an incomplete current day without prematurely breaking the current streak', () => {
    const routine = habit({ startDate: '2026-10-21' })
    expect(streakStats(routine, [occurrence('2026-10-21', 'completed')], localDay('2026-10-22')).current).toBe(1)
  })

  it('handles month and year boundaries using local calendar dates', () => {
    expect(localDateKey(localDay('2025-12-31'))).toBe('2025-12-31')
    expect(isScheduled(habit({ startDate: '2025-12-30' }), '2026-01-01')).toBe(true)
    expect(isScheduled(habit({ startDate: '2026-01-02' }), '2026-01-01')).toBe(false)
  })

  it('preserves pre-archive history without scheduling an archived habit afterward', () => {
    const archived = habit({ archived: true, archivedAt: '2026-10-22', startDate: '2026-10-19' })
    const history = [occurrence('2026-10-20', 'completed')]
    expect(summarizeDate([archived], history, localDay('2026-10-20')).rate).toBe(100)
    expect(summarizeDate([archived], history, localDay('2026-10-22')).scheduled).toBe(0)
    expect(streakStats(archived, history, localDay('2026-10-22'))).toMatchObject({ current: 0, best: 1, successes: 1 })
  })

  it('limits recovery candidates to prior scheduled days in the configured window', () => {
    const routine = habit({ startDate: '2026-10-15' })
    const candidates = listRecoveryCandidates([routine], [], localDay('2026-10-22'), 3)
    expect(candidates.map((item) => item.date)).toEqual(['2026-10-21', '2026-10-20', '2026-10-19'])
    expect(listRecoveryCandidates([routine], [], localDay('2026-10-22'), 0)).toEqual([])
  })
})

describe('points and levels', () => {
  it('sums ledger adjustments and derives levels from the balance', () => {
    expect(currentXp([{ delta: 10 }, { delta: -10 }, { delta: 5 }])).toBe(5)
    expect(levelForXp(0)).toEqual({ level: 1, current: 0, next: 100 })
    expect(levelForXp(240)).toEqual({ level: 3, current: 40, next: 100 })
  })
})
