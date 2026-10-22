const DATABASE_NAME = 'small-habits'
const STORE_NAME = 'state'
const STATE_KEY = 'current'

const initialState = () => ({
  schemaVersion: 1,
  habits: [],
  occurrences: [],
  ledger: [],
  rewards: [],
  redemptions: [],
  settings: {
    theme: 'light',
    weekStartsOn: 1,
    recoveryDays: 3,
    dailyTarget: 80,
    xpPerCompletion: 10,
    dailyBonus: 5,
  },
})

export function normalizeState(value) {
  const defaults = initialState()
  return { ...defaults, ...value, settings: { ...defaults.settings, ...value.settings } }
}

let databasePromise

function openDatabase() {
  if (!globalThis.indexedDB) return Promise.reject(new Error('IndexedDB is not available in this browser.'))
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1)
      request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }
  return databasePromise
}

export async function loadState() {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(STATE_KEY)
    request.onsuccess = () => {
      const saved = request.result
      if (!saved) return resolve(initialState())
      if (saved.schemaVersion !== 1) return reject(new Error(`Unsupported data schema version: ${saved.schemaVersion}`))
      resolve(normalizeState(saved))
    }
    request.onerror = () => reject(request.error)
  })
}

export async function saveState(state) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(state, STATE_KEY)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error ?? new Error('Storage transaction was aborted.'))
  })
}

export function createEmptyState() {
  return initialState()
}

export function validateBackup(value) {
  if (!value || typeof value !== 'object' || value.schemaVersion !== 1) return false
  const arrays = ['habits', 'occurrences', 'ledger', 'rewards', 'redemptions']
  if (!arrays.every((key) => Array.isArray(value[key])) || !value.settings || typeof value.settings !== 'object') return false
  const idsAreUnique = (items) => items.every((item) => typeof item.id === 'string' && item.id.length > 0)
    && new Set(items.map((item) => item.id)).size === items.length
  const settings = value.settings
  if (!['light', 'dark'].includes(settings.theme)
    || ![0, 1].includes(settings.weekStartsOn)
    || !Number.isInteger(settings.recoveryDays) || settings.recoveryDays < 0 || settings.recoveryDays > 7
    || !Number.isInteger(settings.dailyTarget ?? 80) || (settings.dailyTarget ?? 80) < 0 || (settings.dailyTarget ?? 80) > 100
    || !Number.isInteger(settings.xpPerCompletion) || settings.xpPerCompletion < 0 || settings.xpPerCompletion > 100
    || !Number.isInteger(settings.dailyBonus) || settings.dailyBonus < 0 || settings.dailyBonus > 100) return false

  const habitIds = new Set(value.habits.map((habit) => habit.id))
  const validHabits = idsAreUnique(value.habits) && value.habits.every((habit) => {
    if (typeof habit.name !== 'string' || habit.name.trim().length < 2 || habit.name.length > 60
      || typeof habit.archived !== 'boolean' || !['daily', 'weekdays', 'custom'].includes(habit.schedule?.type)) return false
    if (habit.schedule.type === 'custom' && (!Array.isArray(habit.schedule.days) || !habit.schedule.days.length
      || habit.schedule.days.some((day) => !Number.isInteger(day) || day < 0 || day > 6))) return false
    return (!habit.startDate || /^\d{4}-\d{2}-\d{2}$/.test(habit.startDate))
      && (!habit.endDate || /^\d{4}-\d{2}-\d{2}$/.test(habit.endDate))
      && (!habit.archivedAt || /^\d{4}-\d{2}-\d{2}$/.test(habit.archivedAt))
  })
  const occurrenceKeys = new Set()
  const validOccurrences = idsAreUnique(value.occurrences) && value.occurrences.every((item) => {
    const key = `${item.habitId}:${item.date}`
    if (!habitIds.has(item.habitId) || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)
      || !['completed', 'pending', 'skipped'].includes(item.status) || occurrenceKeys.has(key)) return false
    occurrenceKeys.add(key)
    return true
  })
  const validLedger = idsAreUnique(value.ledger) && value.ledger.every((entry) => Number.isInteger(entry.delta)
    && typeof entry.kind === 'string' && typeof entry.note === 'string')
  const validRewards = idsAreUnique(value.rewards) && value.rewards.every((reward) => typeof reward.name === 'string'
    && reward.name.trim().length > 0 && Number.isInteger(reward.cost) && reward.cost > 0)
  const validRedemptions = idsAreUnique(value.redemptions) && value.redemptions.every((item) => typeof item.rewardName === 'string'
    && Number.isInteger(item.cost) && item.cost > 0 && !Number.isNaN(Date.parse(item.date)))
  return validHabits && validOccurrences && validLedger && validRewards && validRedemptions
}
