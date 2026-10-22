import { describe, expect, it } from 'vitest'
import { createEmptyState, validateBackup } from './storage.js'

const validHabit = {
  id: 'habit-1', name: 'Read', archived: false, schedule: { type: 'custom', days: [1, 3, 5] }, startDate: '2026-10-01',
}

describe('backup validation', () => {
  it('accepts a valid version 1 snapshot', () => {
    const backup = createEmptyState()
    backup.habits.push(validHabit)
    backup.occurrences.push({ id: 'occurrence-1', habitId: 'habit-1', date: '2026-10-22', status: 'completed' })
    expect(validateBackup(backup)).toBe(true)
  })

  it('rejects duplicate occurrences, invalid schedules, and unsupported settings', () => {
    const duplicate = createEmptyState()
    duplicate.habits.push(validHabit)
    duplicate.occurrences.push(
      { id: 'one', habitId: 'habit-1', date: '2026-10-22', status: 'completed' },
      { id: 'two', habitId: 'habit-1', date: '2026-10-22', status: 'pending' },
    )
    expect(validateBackup(duplicate)).toBe(false)

    const invalidSchedule = createEmptyState()
    invalidSchedule.habits.push({ ...validHabit, schedule: { type: 'custom', days: [] } })
    expect(validateBackup(invalidSchedule)).toBe(false)

    const invalidSettings = createEmptyState()
    invalidSettings.settings.recoveryDays = 99
    expect(validateBackup(invalidSettings)).toBe(false)
  })
})
