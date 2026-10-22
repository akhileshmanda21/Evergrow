import { addDays, differenceInCalendarDays, eachDayOfInterval, format, isAfter, isBefore, parseISO, startOfDay } from 'date-fns'

export const localDateKey = (date = new Date()) => format(date, 'yyyy-MM-dd')
export const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`

export function isScheduled(habit, date) {
  const day = typeof date === 'string' ? parseISO(date) : date
  const key = localDateKey(day)
  if (habit.startDate && key < habit.startDate) return false
  if (habit.endDate && key > habit.endDate) return false
  const weekday = day.getDay()
  if (habit.schedule?.type === 'daily') return true
  if (habit.schedule?.type === 'weekdays') return weekday >= 1 && weekday <= 5
  if (habit.schedule?.type === 'custom') return habit.schedule.days?.includes(weekday) ?? false
  return true
}

export function isHabitActiveOn(habit, date) {
  if (!habit.archived) return true
  if (!habit.archivedAt) return false
  const key = typeof date === 'string' ? date : localDateKey(date)
  return key < habit.archivedAt
}

export function completionRate(completed, eligible) {
  return eligible === 0 ? null : Math.round((completed / eligible) * 100)
}

export function getOccurrenceStatus(occurrences, habitId, date) {
  return occurrences.find((item) => item.habitId === habitId && item.date === date)?.status ?? 'pending'
}

export function streakStats(habit, occurrences, today = new Date()) {
  const todayKey = localDateKey(today)
  const startKey = habit.startDate ?? (occurrences.filter((item) => item.habitId === habit.id).map((item) => item.date).sort()[0] ?? todayKey)
  const start = parseISO(startKey)
  const archiveEnd = habit.archivedAt ? localDateKey(addDays(parseISO(habit.archivedAt), -1)) : null
  const endKey = [habit.endDate, archiveEnd].filter(Boolean).sort()[0]
  const lastDay = endKey && endKey < todayKey ? parseISO(endKey) : startOfDay(today)
  if (isAfter(start, lastDay)) return { current: 0, best: 0, successes: 0, rate: null }

  let current = 0
  let best = 0
  let run = 0
  let successes = 0
  let currentRunOpen = true
  const days = eachDayOfInterval({ start, end: lastDay })
  for (const day of days) {
    if (!isHabitActiveOn(habit, day) || !isScheduled(habit, day)) continue
    const key = localDateKey(day)
    const status = getOccurrenceStatus(occurrences, habit.id, key)
    if (status === 'skipped') continue
    if (status === 'completed') {
      successes += 1
      run += 1
      best = Math.max(best, run)
      if (currentRunOpen) current += 1
    } else {
      run = 0
      if (key < todayKey) currentRunOpen = false
    }
  }
  const eligible = days.filter((day) => isHabitActiveOn(habit, day) && isScheduled(habit, day) && getOccurrenceStatus(occurrences, habit.id, localDateKey(day)) !== 'skipped').length
  return { current: habit.archived ? 0 : current, best, successes, rate: completionRate(successes, eligible) }
}

export function summarizeDate(habits, occurrences, date) {
  const dateKey = localDateKey(typeof date === 'string' ? parseISO(date) : date)
  const scheduled = habits.filter((habit) => isHabitActiveOn(habit, dateKey) && isScheduled(habit, date))
  const completed = scheduled.filter((habit) => getOccurrenceStatus(occurrences, habit.id, dateKey) === 'completed').length
  const eligible = scheduled.filter((habit) => getOccurrenceStatus(occurrences, habit.id, dateKey) !== 'skipped').length
  return { scheduled: scheduled.length, completed, eligible, rate: completionRate(completed, eligible) }
}

export function summarizeRange(habits, occurrences, start, end) {
  let eligible = 0
  let completed = 0
  for (const date of eachDayOfInterval({ start, end })) {
    const summary = summarizeDate(habits, occurrences, date)
    eligible += summary.eligible
    completed += summary.completed
  }
  return { eligible, completed, rate: completionRate(completed, eligible) }
}

export function currentXp(ledger) {
  return ledger.reduce((total, entry) => total + entry.delta, 0)
}

export function levelForXp(xp) {
  const level = Math.floor(Math.max(0, xp) / 100) + 1
  return { level, current: Math.max(0, xp) % 100, next: 100 }
}

export function listRecoveryCandidates(habits, occurrences, today = new Date(), recoveryDays = 3) {
  const todayKey = localDateKey(today)
  return habits.filter((habit) => !habit.archived).flatMap((habit) => {
    const candidates = []
    for (let offset = 1; offset <= recoveryDays; offset += 1) {
      const date = localDateKey(addDays(today, -offset))
      if (isScheduled(habit, date) && getOccurrenceStatus(occurrences, habit.id, date) === 'pending') {
        candidates.push({ habit, date })
      }
    }
    return candidates.filter((candidate) => isBefore(parseISO(candidate.date), parseISO(todayKey)))
  })
}

export function achievementMilestones(habits, occurrences, today = new Date()) {
  const completed = occurrences.filter((item) => item.status === 'completed')
  const bestStreak = habits.reduce((best, habit) => Math.max(best, streakStats(habit, occurrences, today).best), 0)
  return [
    { id: 'first-check-in', title: 'First small step', detail: 'Complete your first scheduled habit.', earned: completed.length >= 1, progress: Math.min(completed.length, 1) },
    { id: 'week-steady', title: 'A week of showing up', detail: 'Build a 7-day scheduled streak.', earned: bestStreak >= 7, progress: Math.min(bestStreak, 7) },
    { id: 'thirty-check-ins', title: 'Thirty check-ins', detail: 'Complete 30 scheduled occurrences.', earned: completed.length >= 30, progress: Math.min(completed.length, 30) },
  ]
}

export function createOccurrence(habitId, date, status, recoveredAt = null) {
  return { id: makeId(), habitId, date, status, recoveredAt }
}

export function daysBetween(left, right) {
  return differenceInCalendarDays(parseISO(right), parseISO(left))
}
