import { useEffect, useMemo, useState } from 'react'
import { subDays } from 'date-fns'
import {
  createEmptyState,
  isBackupSizeAllowed,
  loadState,
  normalizeState,
  saveState,
  validateBackup,
} from '../storage.js'
import {
  createOccurrence,
  currentXp,
  daysBetween,
  getOccurrenceStatus,
  isScheduled,
  levelForXp,
  listRecoveryCandidates,
  localDateKey,
  makeId,
  streakStats,
  summarizeDate,
} from '../domain.js'
import { weekdayIndex } from '../utils/habitOptions.js'

const today = () => new Date()

export default function useHabitTracker() {
  const [state, setState] = useState(null)
  const [ready, setReady] = useState(false)
  const [storageError, setStorageError] = useState('')
  const [page, setPage] = useState('today')
  const [selectedDate, setSelectedDate] = useState(today())
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState('')
  const [recoveryCandidate, setRecoveryCandidate] = useState(null)

  useEffect(() => {
    loadState()
      .then((saved) => setState(saved))
      .catch((error) => {
        setState(createEmptyState())
        setStorageError(`Local storage could not be opened: ${error.message}`)
      })
      .finally(() => setReady(true))
  }, [])

  useEffect(() => {
    if (!ready || !state) return
    saveState(state).catch((error) =>
      setStorageError(`Could not save your changes: ${error.message}`),
    )
  }, [state, ready])

  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const activeHabits = state?.habits.filter((habit) => !habit.archived) ?? []
  const xp = currentXp(state?.ledger ?? [])
  const level = levelForXp(xp)
  const dateSummary = useMemo(
    () =>
      state
        ? summarizeDate(state.habits, state.occurrences, selectedDate)
        : null,
    [state, selectedDate],
  )
  const recoveryCandidates = useMemo(
    () =>
      state
        ? listRecoveryCandidates(
            state.habits,
            state.occurrences,
            today(),
            state.settings.recoveryDays,
          )
        : [],
    [state],
  )

  function update(mutator) {
    setState((current) => mutator(structuredClone(current)))
  }

  function showToast(message) {
    setToast(message)
  }

  function setOccurrence(habit, date, nextStatus, recovered = false) {
    if (!state) return
    const key = localDateKey(date)
    const currentStatus = getOccurrenceStatus(state.occurrences, habit.id, key)
    if (currentStatus === nextStatus) return

    const dayGap = daysBetween(key, localDateKey(today()))
    if (dayGap < 0) {
      showToast('Future occurrences cannot be changed.')
      return
    }
    if (dayGap > state.settings.recoveryDays) {
      showToast('This date is outside your recovery window.')
      return
    }
    if (!isScheduled(habit, key)) return

    const existing = state.occurrences.find(
      (item) => item.habitId === habit.id && item.date === key,
    )
    const occurrence = existing ?? createOccurrence(habit.id, key, nextStatus)
    const wasCompleted = currentStatus === 'completed'
    const willComplete = nextStatus === 'completed'
    const xpAmount = occurrence.xpAwarded ?? state.settings.xpPerCompletion
    const updatedOccurrence = {
      ...occurrence,
      status: nextStatus,
      ...(willComplete ? { xpAwarded: xpAmount } : {}),
      recoveredAt: recovered
        ? new Date().toISOString()
        : (occurrence.recoveredAt ?? null),
    }
    const occurrences = existing
      ? state.occurrences.map((item) =>
          item.id === existing.id ? updatedOccurrence : item,
        )
      : [...state.occurrences, updatedOccurrence]
    const ledger = [...state.ledger]

    if (wasCompleted !== willComplete) {
      ledger.push({
        id: makeId(),
        sourceKey: `habit:${habit.id}:${key}`,
        kind: willComplete
          ? recovered
            ? 'recovery'
            : 'completion'
          : 'correction',
        delta: willComplete ? xpAmount : -xpAmount,
        note: `${willComplete ? 'Completed' : 'Undid completion'}: ${habit.name} · ${key}`,
        createdAt: new Date().toISOString(),
      })
    }

    const dayHabits = state.habits.filter(
      (item) => !item.archived && isScheduled(item, key),
    )
    const oldAllCompleted =
      dayHabits.length > 0 &&
      dayHabits.every(
        (item) =>
          getOccurrenceStatus(state.occurrences, item.id, key) === 'completed',
      )
    const newAllCompleted =
      dayHabits.length > 0 &&
      dayHabits.every((item) =>
        item.id === habit.id
          ? willComplete
          : getOccurrenceStatus(occurrences, item.id, key) === 'completed',
      )
    const bonusKey = `bonus:${key}`
    const bonusEntries = ledger.filter((entry) => entry.sourceKey === bonusKey)
    const bonusActive =
      bonusEntries.reduce((sum, entry) => sum + entry.delta, 0) > 0
    const originalBonus =
      bonusEntries.find((entry) => entry.kind === 'daily-bonus')?.delta ??
      state.settings.dailyBonus

    if (
      newAllCompleted &&
      !oldAllCompleted &&
      bonusEntries.length > 0 &&
      !bonusActive
    ) {
      ledger.push({
        id: makeId(),
        sourceKey: bonusKey,
        kind: 'bonus-restoration',
        delta: originalBonus,
        note: `Daily bonus restored after correction · ${key}`,
        createdAt: new Date().toISOString(),
      })
    } else if (newAllCompleted && !oldAllCompleted && !bonusActive) {
      ledger.push({
        id: makeId(),
        sourceKey: bonusKey,
        kind: 'daily-bonus',
        delta: state.settings.dailyBonus,
        note: `All scheduled habits completed · ${key}`,
        createdAt: new Date().toISOString(),
      })
    } else if (!newAllCompleted && oldAllCompleted && bonusActive) {
      ledger.push({
        id: makeId(),
        sourceKey: bonusKey,
        kind: 'bonus-correction',
        delta: -originalBonus,
        note: `Daily bonus reversed after correction · ${key}`,
        createdAt: new Date().toISOString(),
      })
    }

    setState({ ...state, occurrences, ledger })
    showToast(
      willComplete
        ? `${habit.name} completed`
        : nextStatus === 'skipped'
          ? `${habit.name} excused for the day`
          : 'Check-in updated',
    )
  }

  function saveHabit(formData) {
    const schedule =
      formData.scheduleType === 'custom'
        ? {
            type: 'custom',
            days: formData.days.map(weekdayIndex).filter((day) => day >= 0),
          }
        : { type: formData.scheduleType }
    const habit = {
      id: formData.id ?? makeId(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      icon: formData.icon,
      category: formData.category,
      schedule,
      reminder: formData.reminder || null,
      startDate: formData.startDate || localDateKey(today()),
      archived: false,
    }
    if (!habit.name) return

    update((next) => {
      const index = next.habits.findIndex((item) => item.id === habit.id)
      if (index >= 0) {
        const existing = next.habits[index]
        next.habits[index] = {
          ...existing,
          ...habit,
          archived: existing.archived,
          archivedAt: existing.archivedAt,
        }
      } else {
        next.habits.push(habit)
      }
      return next
    })
    setModal(null)
    showToast(formData.id ? 'Habit updated' : 'Habit added')
  }

  function recover(candidate = recoveryCandidate) {
    if (!candidate) return
    const impact = streakStats(candidate.habit, state.occurrences, today())
    const restores =
      impact.current > 0 || candidate.date === localDateKey(subDays(today(), 1))
    const explanation = restores
      ? `This recovery may reconnect ${candidate.habit.name}'s current streak. It will also award ${state.settings.xpPerCompletion} XP once.`
      : `This recovery adds ${state.settings.xpPerCompletion} XP and updates historical completion. It may not reconnect the current streak because another missed scheduled day sits between.`
    if (!window.confirm(explanation)) return
    setOccurrence(
      candidate.habit,
      new Date(`${candidate.date}T12:00:00`),
      'completed',
      true,
    )
    setRecoveryCandidate(null)
  }

  function archiveHabit(habit) {
    update((next) => {
      const target = next.habits.find((item) => item.id === habit.id)
      if (target) {
        target.archived = true
        target.archivedAt = localDateKey(today())
      }
      return next
    })
    showToast('Habit archived. Its history is preserved.')
  }

  function restoreHabit(habit) {
    update((next) => {
      const target = next.habits.find((item) => item.id === habit.id)
      if (target) {
        target.archived = false
        delete target.archivedAt
      }
      return next
    })
    showToast('Habit restored')
  }

  function deleteHabit(habit) {
    if (
      !window.confirm(
        `Delete “${habit.name}” and its history? This cannot be undone.`,
      )
    )
      return
    update((next) => {
      next.habits = next.habits.filter((item) => item.id !== habit.id)
      next.occurrences = next.occurrences.filter(
        (item) => item.habitId !== habit.id,
      )
      return next
    })
    showToast('Habit and history deleted')
  }

  function createReward(formData) {
    if (!formData.name.trim() || Number(formData.cost) < 1) return
    update((next) => {
      next.rewards.push({
        id: makeId(),
        name: formData.name.trim(),
        cost: Number(formData.cost),
        createdAt: new Date().toISOString(),
      })
      return next
    })
    setModal(null)
    showToast('Reward added')
  }

  function redeem(reward) {
    if (xp < reward.cost) return
    if (
      !window.confirm(
        `Redeem “${reward.name}” for ${reward.cost} XP? Redemptions are permanent and are not reversed by later habit edits.`,
      )
    )
      return
    const redemption = {
      id: makeId(),
      rewardId: reward.id,
      rewardName: reward.name,
      cost: reward.cost,
      date: new Date().toISOString(),
    }
    setState((current) => ({
      ...current,
      redemptions: [...current.redemptions, redemption],
      ledger: [
        ...current.ledger,
        {
          id: makeId(),
          sourceKey: `redeem:${redemption.id}`,
          kind: 'redemption',
          delta: -reward.cost,
          note: `Redeemed: ${reward.name}`,
          createdAt: redemption.date,
        },
      ],
    }))
    showToast('Reward redeemed')
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json',
    })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `riseo-backup-${localDateKey(today())}.json`
    link.click()
    URL.revokeObjectURL(link.href)
    showToast('Backup exported')
  }

  async function importBackup(event) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      if (!isBackupSizeAllowed(file.size))
        throw new Error('Backup file must be 10 MB or smaller.')
      const candidate = JSON.parse(await file.text())
      if (!validateBackup(candidate))
        throw new Error('The file is not a valid Riseo version 1 backup.')
      if (
        !window.confirm(
          'Replace all current local data with this backup? This cannot be undone.',
        )
      )
        return
      setState(normalizeState(candidate))
      showToast('Backup restored')
    } catch (error) {
      showToast(error.message || 'Could not read backup')
    } finally {
      event.target.value = ''
    }
  }

  function resetData() {
    if (
      !window.confirm(
        'Delete all habits, records, XP, and rewards from this browser? Export a backup first if needed.',
      )
    )
      return
    setState(createEmptyState())
    setPage('today')
    showToast('Local data reset')
  }

  function updateSettings(key, value) {
    update((next) => {
      next.settings[key] = value
      return next
    })
  }

  return {
    activeHabits,
    archiveHabit,
    createReward,
    dateSummary,
    deleteHabit,
    exportBackup,
    importBackup,
    level,
    modal,
    page,
    ready,
    recover,
    recoveryCandidate,
    recoveryCandidates,
    redeem,
    resetData,
    restoreHabit,
    saveHabit,
    selectedDate,
    setModal,
    setOccurrence,
    setPage,
    setRecoveryCandidate,
    setSelectedDate,
    state,
    storageError,
    toast,
    updateSettings,
    xp,
  }
}
