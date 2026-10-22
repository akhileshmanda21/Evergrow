import { useEffect, useMemo, useState } from 'react'
import {
  Activity, Archive, ArrowDownToLine, ArrowLeft, ArrowRight, Award, BarChart3, Bell, CalendarDays,
  Check, CheckCheck, ChevronDown, CircleHelp, CirclePlus, Flame, Heart, Leaf, ListChecks, Moon,
  MoreHorizontal, Pencil, Plus, RotateCcw, Settings, ShieldCheck, Sparkles, Sun, Target, Trash2,
  Trophy, Wallet, X,
} from 'lucide-react'
import { addDays, endOfMonth, format, isSameDay, startOfMonth, startOfWeek, subDays } from 'date-fns'
import { createEmptyState, loadState, normalizeState, saveState, validateBackup } from './storage.js'
import './achievements.css'
import './mobile-settings.css'
import {
  achievementMilestones, completionRate, createOccurrence, currentXp, getOccurrenceStatus,
  isHabitActiveOn, isScheduled, levelForXp, listRecoveryCandidates, localDateKey, makeId,
  streakStats, summarizeDate, summarizeRange,
} from './domain.js'
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

const navItems = [
  { id: 'today', label: 'Today', icon: ListChecks },
  { id: 'habits', label: 'Habits', icon: Activity },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'rewards', label: 'Rewards', icon: Trophy },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
]
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const categories = ['Wellbeing', 'Focus', 'Movement', 'Learning', 'Home', 'Other']
const iconOptions = ['🌱', '📖', '💧', '🚶', '🧘', '✍️', '🥗', '🎨']
const today = () => new Date()
const formatLongDate = (date) => format(date, 'EEEE, MMMM d')
const weekdayIndex = (value) => weekdays.indexOf(value)

function App() {
  const [state, setState] = useState(null)
  const [ready, setReady] = useState(false)
  const [storageError, setStorageError] = useState('')
  const [page, setPage] = useState('today')
  const [selectedDate, setSelectedDate] = useState(today())
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState('')
  const [recoveryCandidate, setRecoveryCandidate] = useState(null)

  useEffect(() => {
    loadState().then((saved) => setState(saved)).catch((error) => {
      setState(createEmptyState())
      setStorageError(`Local storage could not be opened: ${error.message}`)
    }).finally(() => setReady(true))
  }, [])

  useEffect(() => {
    if (!ready || !state) return
    saveState(state).catch((error) => setStorageError(`Could not save your changes: ${error.message}`))
  }, [state, ready])

  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const activeHabits = state?.habits.filter((habit) => !habit.archived) ?? []
  const xp = currentXp(state?.ledger ?? [])
  const level = levelForXp(xp)
  const selectedKey = localDateKey(selectedDate)
  const dateSummary = useMemo(() => state ? summarizeDate(state.habits, state.occurrences, selectedDate) : null, [state, selectedDate])
  const recoveryCandidates = useMemo(() => state ? listRecoveryCandidates(state.habits, state.occurrences, today(), state.settings.recoveryDays) : [], [state])

  function update(mutator) {
    setState((current) => mutator(structuredClone(current)))
  }

  function showToast(message) {
    setToast(message)
  }

  function addLedger(entry) {
    entry.id = makeId()
    entry.createdAt = new Date().toISOString()
    setState((current) => ({ ...current, ledger: [...current.ledger, entry] }))
  }

  function setOccurrence(habit, date, nextStatus, recovered = false) {
    if (!state) return
    const key = localDateKey(date)
    const currentStatus = getOccurrenceStatus(state.occurrences, habit.id, key)
    if (currentStatus === nextStatus) return
    const dayGap = Math.round((new Date(`${localDateKey(today())}T00:00:00`) - new Date(`${key}T00:00:00`)) / 86400000)
    if (dayGap < 0) {
      showToast('Future occurrences cannot be changed.')
      return
    }
    if (dayGap > 0 && dayGap > state.settings.recoveryDays) {
      showToast('This date is outside your recovery window.')
      return
    }
    if (!isScheduled(habit, key)) return

    const existing = state.occurrences.find((item) => item.habitId === habit.id && item.date === key)
    const occurrence = existing ?? createOccurrence(habit.id, key, nextStatus)
    const wasCompleted = currentStatus === 'completed'
    const willComplete = nextStatus === 'completed'
    const xpAmount = occurrence.xpAwarded ?? state.settings.xpPerCompletion
    const updatedOccurrence = {
      ...occurrence,
      status: nextStatus,
      ...(willComplete ? { xpAwarded: xpAmount } : {}),
      recoveredAt: recovered ? new Date().toISOString() : occurrence.recoveredAt ?? null,
    }
    const occurrences = existing
      ? state.occurrences.map((item) => item.id === existing.id ? updatedOccurrence : item)
      : [...state.occurrences, updatedOccurrence]
    let ledger = [...state.ledger]
    if (wasCompleted !== willComplete) {
      ledger.push({
        id: makeId(), sourceKey: `habit:${habit.id}:${key}`, kind: willComplete ? (recovered ? 'recovery' : 'completion') : 'correction',
        delta: willComplete ? xpAmount : -xpAmount, note: `${willComplete ? 'Completed' : 'Undid completion'}: ${habit.name} · ${key}`,
        createdAt: new Date().toISOString(),
      })
    }

    const dayHabits = state.habits.filter((item) => !item.archived && isScheduled(item, key))
    const oldAllCompleted = dayHabits.length > 0 && dayHabits.every((item) => getOccurrenceStatus(state.occurrences, item.id, key) === 'completed')
    const newAllCompleted = dayHabits.length > 0 && dayHabits.every((item) => item.id === habit.id ? willComplete : getOccurrenceStatus(occurrences, item.id, key) === 'completed')
    const bonusKey = `bonus:${key}`
    const bonusEntries = ledger.filter((entry) => entry.sourceKey === bonusKey)
    const bonusActive = bonusEntries.reduce((sum, entry) => sum + entry.delta, 0) > 0
    const originalBonus = bonusEntries.find((entry) => entry.kind === 'daily-bonus')?.delta ?? state.settings.dailyBonus
    if (newAllCompleted && !oldAllCompleted && bonusEntries.length > 0 && !bonusActive) {
      ledger.push({ id: makeId(), sourceKey: bonusKey, kind: 'bonus-restoration', delta: originalBonus, note: `Daily bonus restored after correction · ${key}`, createdAt: new Date().toISOString() })
    } else if (newAllCompleted && !oldAllCompleted && !bonusActive) {
      ledger.push({ id: makeId(), sourceKey: bonusKey, kind: 'daily-bonus', delta: state.settings.dailyBonus, note: `All scheduled habits completed · ${key}`, createdAt: new Date().toISOString() })
    } else if (!newAllCompleted && oldAllCompleted && bonusActive) {
      ledger.push({ id: makeId(), sourceKey: bonusKey, kind: 'bonus-correction', delta: -originalBonus, note: `Daily bonus reversed after correction · ${key}`, createdAt: new Date().toISOString() })
    }

    setState({ ...state, occurrences, ledger })
    showToast(willComplete ? `${habit.name} completed` : nextStatus === 'skipped' ? `${habit.name} excused for the day` : 'Check-in updated')
  }

  function saveHabit(formData) {
    const schedule = formData.scheduleType === 'custom'
      ? { type: 'custom', days: formData.days.map(weekdayIndex).filter((day) => day >= 0) }
      : { type: formData.scheduleType }
    const habit = {
      id: formData.id ?? makeId(), name: formData.name.trim(), description: formData.description.trim(),
      icon: formData.icon, category: formData.category, schedule, reminder: formData.reminder || null,
      startDate: formData.startDate || localDateKey(today()), archived: false,
    }
    if (!habit.name) return
    update((next) => {
      const index = next.habits.findIndex((item) => item.id === habit.id)
      if (index >= 0) {
        const existing = next.habits[index]
        next.habits[index] = { ...existing, ...habit, archived: existing.archived, archivedAt: existing.archivedAt }
      }
      else next.habits.push(habit)
      return next
    })
    setModal(null)
    showToast(formData.id ? 'Habit updated' : 'Habit added')
  }

  function recover(candidate) {
    if (!candidate) return
    const impact = streakStats(candidate.habit, state.occurrences, today())
    const restores = impact.current > 0 || candidate.date === localDateKey(subDays(today(), 1))
    const explanation = restores
      ? `This recovery may reconnect ${candidate.habit.name}'s current streak. It will also award ${state.settings.xpPerCompletion} XP once.`
      : `This recovery adds ${state.settings.xpPerCompletion} XP and updates historical completion. It may not reconnect the current streak because another missed scheduled day sits between.`
    if (!window.confirm(explanation)) return
    setOccurrence(candidate.habit, new Date(`${candidate.date}T12:00:00`), 'completed', true)
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
    if (!window.confirm(`Delete “${habit.name}” and its history? This cannot be undone.`)) return
    update((next) => {
      next.habits = next.habits.filter((item) => item.id !== habit.id)
      next.occurrences = next.occurrences.filter((item) => item.habitId !== habit.id)
      return next
    })
    showToast('Habit and history deleted')
  }

  function createReward(formData) {
    if (!formData.name.trim() || Number(formData.cost) < 1) return
    update((next) => {
      next.rewards.push({ id: makeId(), name: formData.name.trim(), cost: Number(formData.cost), createdAt: new Date().toISOString() })
      return next
    })
    setModal(null)
    showToast('Reward added')
  }

  function redeem(reward) {
    if (xp < reward.cost) return
    if (!window.confirm(`Redeem “${reward.name}” for ${reward.cost} XP? Redemptions are permanent and are not reversed by later habit edits.`)) return
    const redemption = { id: makeId(), rewardId: reward.id, rewardName: reward.name, cost: reward.cost, date: new Date().toISOString() }
    setState((current) => ({
      ...current,
      redemptions: [...current.redemptions, redemption],
      ledger: [...current.ledger, { id: makeId(), sourceKey: `redeem:${redemption.id}`, kind: 'redemption', delta: -reward.cost, note: `Redeemed: ${reward.name}`, createdAt: redemption.date }],
    }))
    showToast('Reward redeemed')
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `evergrow-backup-${localDateKey(today())}.json`
    link.click()
    URL.revokeObjectURL(link.href)
    showToast('Backup exported')
  }

  async function importBackup(event) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const candidate = JSON.parse(await file.text())
      if (!validateBackup(candidate)) throw new Error('The file is not a valid Evergrow version 1 backup.')
      if (!window.confirm('Replace all current local data with this backup? This cannot be undone.')) return
      setState(normalizeState(candidate))
      showToast('Backup restored')
    } catch (error) {
      showToast(error.message || 'Could not read backup')
    } finally {
      event.target.value = ''
    }
  }

  function resetData() {
    if (!window.confirm('Delete all habits, records, XP, and rewards from this browser? Export a backup first if needed.')) return
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

  if (!ready || !state) return <div className="loading-screen"><div className="loading-mark"><Leaf size={23} /></div><span>Opening your habit garden</span></div>

  const theme = state.settings.theme
  return (
    <div className={`app-shell theme-${theme}`}>
      <aside className="sidebar">
        <a className="brand" href="#today" onClick={(event) => { event.preventDefault(); setPage('today') }}>
          <span className="brand-mark"><Leaf size={19} /></span><span>Evergrow<span className="brand-period">.</span></span>
        </a>
        <div className="side-label">YOUR SPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => setPage(id)} aria-current={page === id ? 'page' : undefined}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{id === 'today' && dateSummary?.scheduled > 0 && <span className="nav-count">{dateSummary.completed}/{dateSummary.scheduled}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="backup-note"><ShieldCheck size={16} /><span>Your data stays on this device. Export a backup from Settings.</span></div>
          <button className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={() => setPage('settings')}><Settings size={18} /><span>Settings</span></button>
          <div className="profile-row"><div className="profile-avatar">Y</div><div><strong>Your space</strong><span>Personal tracker</span></div><button className="theme-toggle icon-button" onClick={() => updateSettings('theme', theme === 'light' ? 'dark' : 'light')} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</button></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar"><div className="mobile-brand"><span className="brand-mark"><Leaf size={17} /></span>Evergrow<span className="brand-period">.</span></div><div className="breadcrumb">Your space <span>/</span> <strong>{navItems.find((item) => item.id === page)?.label ?? 'Settings'}</strong></div><div className="topbar-right"><div className="xp-chip"><Sparkles size={15} /><span>{xp} XP</span></div><button className="icon-button mobile-settings" onClick={() => setPage('settings')} aria-label="Settings"><Settings size={17} /></button><button className="icon-button top-theme" onClick={() => updateSettings('theme', theme === 'light' ? 'dark' : 'light')} aria-label="Toggle color theme">{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</button></div></header>
        {storageError && <div role="alert" className="storage-alert"><CircleHelp size={17} />{storageError}</div>}
        <div className="content-wrap">
          {page === 'today' && <TodayPage state={state} activeHabits={activeHabits} date={selectedDate} summary={dateSummary} xp={xp} level={level} weekStartsOn={state.settings.weekStartsOn} onAdd={() => setModal({ type: 'habit' })} onTrack={setOccurrence} onDate={setSelectedDate} recoveryCandidates={recoveryCandidates} onRecover={setRecoveryCandidate} />}
          {page === 'habits' && <HabitsPage habits={state.habits} occurrences={state.occurrences} onAdd={() => setModal({ type: 'habit' })} onEdit={(habit) => setModal({ type: 'habit', habit })} onArchive={archiveHabit} onRestore={restoreHabit} onDelete={deleteHabit} />}
          {page === 'calendar' && <CalendarPage habits={state.habits} occurrences={state.occurrences} weekStartsOn={state.settings.weekStartsOn} onSelect={(date) => { setSelectedDate(date); setPage('today') }} />}
          {page === 'rewards' && <RewardsPage rewards={state.rewards} redemptions={state.redemptions} xp={xp} onAdd={() => setModal({ type: 'reward' })} onRedeem={redeem} />}
          {page === 'insights' && <InsightsPage habits={activeHabits} occurrences={state.occurrences} />}
          {page === 'settings' && <SettingsPage state={state} onSetting={updateSettings} onExport={exportBackup} onImport={importBackup} onReset={resetData} />}
        </div>
      </main>

      {modal?.type === 'habit' && <HabitModal habit={modal.habit} onClose={() => setModal(null)} onSave={saveHabit} />}
      {modal?.type === 'reward' && <RewardModal onClose={() => setModal(null)} onSave={createReward} />}
      {recoveryCandidate && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRecoveryCandidate(null) }}><div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="recovery-title"><button className="icon-button modal-close" onClick={() => setRecoveryCandidate(null)} aria-label="Close"><X size={18} /></button><div className="modal-icon mint"><RotateCcw size={20} /></div><p className="eyebrow">MISSED OCCURRENCE</p><h2 id="recovery-title">Recover {recoveryCandidate.habit.name}?</h2><p>This will mark {format(new Date(`${recoveryCandidate.date}T12:00:00`), 'MMMM d')} complete, update your streak and completion history, and award XP once. Recovery is available for the previous {state.settings.recoveryDays} calendar days.</p><div className="modal-actions"><button className="button button-quiet" onClick={() => setRecoveryCandidate(null)}>Not now</button><button className="button button-primary" onClick={() => recover(recoveryCandidate)}>Confirm recovery</button></div></div></div>}
      {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
    </div>
  )
}

function PageHeading({ eyebrow, title, subtitle, action }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{subtitle && <p className="page-subtitle">{subtitle}</p>}</div>{action}</div>
}

function TodayPage({ state, activeHabits, date, summary, xp, level, weekStartsOn, onAdd, onTrack, onDate, recoveryCandidates, onRecover }) {
  const key = localDateKey(date)
  const todayKey = localDateKey(today())
  const isToday = key === todayKey
  const scheduled = activeHabits.filter((habit) => isScheduled(habit, date))
  const completed = scheduled.filter((habit) => getOccurrenceStatus(state.occurrences, habit.id, key) === 'completed')
  const maxCurrent = activeHabits.reduce((max, habit) => Math.max(max, streakStats(habit, state.occurrences).current), 0)
  const maxBest = activeHabits.reduce((max, habit) => Math.max(max, streakStats(habit, state.occurrences).best), 0)
  const dailyRate = summary?.rate ?? null

  return <>
    <PageHeading eyebrow={isToday ? formatLongDate(date).toUpperCase() : 'PAST CHECK-IN'} title={isToday ? 'A little progress, today.' : format(date, 'EEEE, MMMM d')} subtitle={isToday ? 'A steady rhythm is built one day at a time.' : 'Your history stays editable within the recovery window.'} action={<button className="button button-primary" onClick={onAdd}><Plus size={17} />New habit</button>} />
    <div className="date-strip"><button className="icon-button" aria-label="Previous day" onClick={() => onDate(subDays(date, 1))}><ArrowLeft size={17} /></button><button className="date-current" onClick={() => onDate(today())}><CalendarDays size={16} />{isToday ? 'Today' : format(date, 'MMM d, yyyy')}</button><button className="icon-button" aria-label="Next day" onClick={() => onDate(addDays(date, 1))} disabled={isToday}><ArrowRight size={17} /></button><span className="date-hint">{format(date, 'EEEE')}</span></div>
    <section className="stats-grid" aria-label="Your progress">
      <StatCard label="Today's progress" value={dailyRate === null ? '—' : `${dailyRate}%`} detail={`${summary.completed} of ${summary.scheduled} scheduled · target ${state.settings.dailyTarget}%`} icon={Target} accent="green" progress={dailyRate ?? 0} />
      <StatCard label="Current streak" value={`${maxCurrent} days`} detail="Across your habits" icon={Flame} accent="coral" />
      <StatCard label="Best streak" value={`${maxBest} days`} detail="Personal best" icon={Award} accent="gold" />
      <StatCard label="Level progress" value={`Level ${level.level}`} detail={`${level.current} / ${level.next} XP to next`} icon={Sparkles} accent="blue" progress={level.current} />
    </section>

    <div className="dashboard-grid">
      <section className="panel today-panel"><div className="panel-heading"><div><h2>Your habits</h2><p>{summary.scheduled ? `${summary.completed} of ${summary.scheduled} complete` : 'Nothing scheduled for today'}</p></div><span className="panel-date">{format(date, 'MMM d')}</span></div>
        {scheduled.length ? <div className="habit-checklist">{scheduled.map((habit) => {
          const status = getOccurrenceStatus(state.occurrences, habit.id, key)
          const allowed = !isToday && Math.round((new Date(`${todayKey}T00:00:00`) - new Date(`${key}T00:00:00`)) / 86400000) > state.settings.recoveryDays
          return <div className={`check-row ${status}`} key={habit.id}><span className="habit-emoji">{habit.icon}</span><div className="check-habit-copy"><strong>{habit.name}</strong><span>{habit.category}{habit.reminder ? ` · ${habit.reminder}` : ''}</span></div>{status === 'skipped' && <span className="status-label">Excused</span>}<button className={`check-control ${status === 'completed' ? 'is-done' : ''}`} disabled={allowed} onClick={() => onTrack(habit, date, status === 'completed' ? 'pending' : 'completed')} aria-label={`${status === 'completed' ? 'Undo completion of' : 'Complete'} ${habit.name}`} title={status === 'completed' ? 'Undo check-in' : 'Mark complete'}>{status === 'completed' ? <Check size={17} /> : <span />}</button><button className="skip-control" disabled={allowed} onClick={() => onTrack(habit, date, status === 'skipped' ? 'pending' : 'skipped')} aria-label={`${status === 'skipped' ? 'Undo excused status for' : 'Excuse'} ${habit.name}`} title="Excuse today">{status === 'skipped' ? <RotateCcw size={14} /> : <MoreHorizontal size={17} />}</button></div>
        })}</div> : <EmptyState icon={Leaf} title={activeHabits.length ? 'A clear day' : 'Start with one small habit'} detail={activeHabits.length ? 'You have no habits scheduled for this day.' : 'Add something you can return to, even on an ordinary day.'} action={!activeHabits.length && <button className="button button-secondary" onClick={onAdd}><Plus size={16} />Add your first habit</button>} />}
        {scheduled.length > 0 && completed.length === scheduled.length && <div className="complete-banner"><CheckCheck size={17} /><span>Everything scheduled is done. Nice work.</span><span className="bonus-tag">+{state.settings.dailyBonus} XP bonus</span></div>}
      </section>
      <div className="right-stack">
        <section className="level-panel"><div className="level-top"><span className="level-icon"><Sparkles size={19} /></span><span className="level-kicker">YOUR MOMENTUM</span><span className="level-number">LVL {level.level}</span></div><div className="level-total">{xp}<span> total XP</span></div><div className="level-meter"><span style={{ width: `${level.current}%` }} /></div><div className="level-foot"><span>{level.current} XP</span><span>{level.next - level.current} to level {level.level + 1}</span></div></section>
        <section className="panel recovery-panel"><div className="panel-heading compact"><div><h2>Room to recover</h2><p>Recent missed check-ins</p></div><RotateCcw size={17} className="muted-icon" /></div>{recoveryCandidates.length ? <div className="recovery-list">{recoveryCandidates.slice(0, 3).map((candidate) => <div className="recovery-row" key={`${candidate.habit.id}-${candidate.date}`}><span>{candidate.habit.icon}</span><div><strong>{candidate.habit.name}</strong><small>{format(new Date(`${candidate.date}T12:00:00`), 'EEE, MMM d')}</small></div><button className="recover-button" onClick={() => onRecover(candidate)}>Review</button></div>)}</div> : <p className="recovery-empty">Nothing recent to recover. Keep showing up at your pace.</p>}</section>
        <AchievementsPanel achievements={achievementMilestones(state.habits, state.occurrences)} />
        <section className="quote-panel"><span className="quote-mark">“</span><p>Consistency is a kindness you show your future self.</p><span className="quote-line" /></section>
      </div>
    </div>
    <section className="weekly-strip panel"><div><p className="eyebrow">THIS WEEK</p><h2>A week of small wins</h2></div><WeekOverview habits={activeHabits} occurrences={state.occurrences} weekStartsOn={weekStartsOn} /></section>
  </>
}

function StatCard({ label, value, detail, icon: Icon, accent, progress }) {
  return <article className={`stat-card accent-${accent}`}><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={17} /></span></div><strong>{value}</strong><span className="stat-detail">{detail}</span>{progress !== undefined && <div className="stat-progress"><span style={{ width: `${progress}%` }} /></div>}</article>
}

function WeekOverview({ habits, occurrences, weekStartsOn }) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(today(), { weekStartsOn }), index))
  return <div className="week-overview">{days.map((date) => {
    const future = localDateKey(date) > localDateKey(today())
    const info = future ? null : summarizeDate(habits, occurrences, date)
    const isCurrent = isSameDay(date, today())
    return <div className={`week-day ${isCurrent ? 'current' : ''}`} key={localDateKey(date)}><span>{format(date, 'EEEEE')}</span><div className={`week-dot ${info?.rate === 100 && info.eligible ? 'full' : info?.completed ? 'partial' : ''}`} title={`${format(date, 'EEEE, MMM d')}: ${future ? 'upcoming' : `${info.completed}/${info.eligible} completed`}`}>{info?.rate === 100 && info.eligible ? <Check size={13} /> : info?.completed || info?.eligible ? <span /> : <i />}</div><small>{future || !info?.eligible ? '—' : `${info.completed}/${info.eligible}`}</small></div>
  })}</div>
}

function AchievementsPanel({ achievements }) {
  const earned = achievements.filter((item) => item.earned)
  return <section className="panel achievements-panel"><div className="panel-heading compact"><div><h2>Milestones</h2><p>{earned.length} of {achievements.length} reached</p></div><Award size={17} className="muted-icon" /></div><div className="achievement-list">{achievements.map((item) => <div className={`achievement-row ${item.earned ? 'earned' : ''}`} key={item.id}><span className="achievement-icon">{item.earned ? <Check size={13} /> : <Award size={13} />}</span><div><strong>{item.title}</strong><small>{item.earned ? 'Reached' : item.detail}</small></div></div>)}</div></section>
}

function HabitsPage({ habits, occurrences, onAdd, onEdit, onArchive, onRestore, onDelete }) {
  const [showArchived, setShowArchived] = useState(false)
  const visible = habits.filter((habit) => showArchived || !habit.archived)
  return <>
    <PageHeading eyebrow="YOUR ROUTINES" title="Habits" subtitle="Make room for the things you want to keep doing." action={<button className="button button-primary" onClick={onAdd}><Plus size={17} />New habit</button>} />
    <div className="toolbar-row"><span className="toolbar-count">{habits.filter((habit) => !habit.archived).length} active habits</span><button className="text-button" onClick={() => setShowArchived((value) => !value)}>{showArchived ? 'Hide archived' : 'Show archived'}</button></div>
    <div className="habit-management-list">{visible.length ? visible.map((habit) => {
      const stats = streakStats(habit, occurrences)
      return <article className={`manage-habit ${habit.archived ? 'archived' : ''}`} key={habit.id}><span className="manage-emoji">{habit.icon}</span><div className="manage-main"><div className="manage-title"><h2>{habit.name}</h2>{habit.archived && <span className="archived-pill">Archived</span>}</div><p>{habit.description || `${habit.category} · ${scheduleLabel(habit.schedule)}`}</p></div><div className="habit-metric"><strong><Flame size={15} />{stats.current}</strong><span>current streak</span></div><div className="habit-metric"><strong>{stats.rate === null ? '—' : `${stats.rate}%`}</strong><span>completion</span></div><div className="habit-actions"><button className="icon-button" onClick={() => onEdit(habit)} aria-label={`Edit ${habit.name}`} title="Edit"><Pencil size={16} /></button>{habit.archived ? <><button className="icon-button" onClick={() => onRestore(habit)} aria-label={`Restore ${habit.name}`} title="Restore"><RotateCcw size={16} /></button><button className="icon-button danger-icon" onClick={() => onDelete(habit)} aria-label={`Delete ${habit.name}`} title="Delete"><Trash2 size={16} /></button></> : <button className="icon-button" onClick={() => onArchive(habit)} aria-label={`Archive ${habit.name}`} title="Archive"><Archive size={16} /></button>}</div></article>
    }) : <EmptyState icon={Leaf} title="No habits here yet" detail="A good routine starts small. Add one thing you want to practice." action={<button className="button button-primary" onClick={onAdd}><Plus size={16} />Create a habit</button>} />}</div>
  </>
}

function scheduleLabel(schedule = {}) {
  if (schedule.type === 'daily') return 'Every day'
  if (schedule.type === 'weekdays') return 'Weekdays'
  if (schedule.type === 'custom') return (schedule.days ?? []).map((day) => weekdays[day]).join(', ') || 'No days selected'
  return 'Every day'
}

function CalendarPage({ habits, occurrences, weekStartsOn, onSelect }) {
  const [month, setMonth] = useState(startOfMonth(today()))
  const firstDay = startOfMonth(month)
  const gridStart = subDays(firstDay, (firstDay.getDay() - weekStartsOn + 7) % 7)
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
  const calendarWeekdays = Array.from({ length: 7 }, (_, index) => weekdays[(weekStartsOn + index) % 7])
  const active = habits
  return <>
    <PageHeading eyebrow="YOUR HISTORY" title="Calendar" subtitle="A gentle view of your rhythm, not a scorecard." />
    <section className="panel calendar-panel"><div className="calendar-toolbar"><div><h2>{format(month, 'MMMM yyyy')}</h2><p>Choose a day to review its check-ins.</p></div><div className="calendar-nav"><button className="icon-button" aria-label="Previous month" onClick={() => setMonth((value) => addDays(startOfMonth(value), -1))}><ArrowLeft size={17} /></button><button className="text-button" onClick={() => setMonth(startOfMonth(today()))}>Today</button><button className="icon-button" aria-label="Next month" onClick={() => setMonth(startOfMonth(addDays(endOfMonth(month), 1)))}><ArrowRight size={17} /></button></div></div><div className="calendar-grid calendar-weekdays">{calendarWeekdays.map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{days.map((day) => {
      const scheduled = active.filter((habit) => isHabitActiveOn(habit, day) && isScheduled(habit, day))
      const completeCount = scheduled.filter((habit) => getOccurrenceStatus(occurrences, habit.id, localDateKey(day)) === 'completed').length
      const skippedCount = scheduled.filter((habit) => getOccurrenceStatus(occurrences, habit.id, localDateKey(day)) === 'skipped').length
      const past = localDateKey(day) < localDateKey(today())
      const stateClass = scheduled.length === 0 ? 'nonscheduled' : completeCount === scheduled.length ? 'day-complete' : completeCount > 0 ? 'day-partial' : past && skippedCount < scheduled.length ? 'day-missed' : 'day-neutral'
      return <button key={localDateKey(day)} onClick={() => onSelect(day)} className={`calendar-cell ${stateClass} ${day.getMonth() !== month.getMonth() ? 'outside-month' : ''} ${isSameDay(day, today()) ? 'calendar-today' : ''}`} aria-label={`${format(day, 'MMMM d')}, ${completeCount} of ${scheduled.length} complete`}><span>{format(day, 'd')}</span>{scheduled.length > 0 && <i className="calendar-indicator" />}</button>
    })}</div><div className="calendar-legend"><span><i className="legend-dot complete" />Complete</span><span><i className="legend-dot partial" />In progress</span><span><i className="legend-dot missed" />Missed</span><span><i className="legend-dot none" />Not scheduled</span></div></section>
  </>
}

function RewardsPage({ rewards, redemptions, xp, onAdd, onRedeem }) {
  return <>
    <PageHeading eyebrow="A LITTLE SOMETHING FOR YOU" title="Rewards" subtitle="Turn steady effort into something you genuinely enjoy." action={<button className="button button-primary" onClick={onAdd}><Plus size={17} />Add reward</button>} />
    <section className="reward-balance"><span className="reward-balance-icon"><Sparkles size={21} /></span><div><span>Available balance</span><strong>{xp} <small>XP</small></strong></div><span className="balance-note">Earn points by completing scheduled habits.</span></section>
    <div className="section-title-row"><div><h2>Your rewards</h2><p>Personal treats, chosen by you.</p></div></div>
    {rewards.length ? <div className="rewards-grid">{rewards.map((reward, index) => <article className="reward-card" key={reward.id}><div className={`reward-card-art art-${index % 4}`}><Heart size={24} strokeWidth={1.5} /></div><div className="reward-card-body"><span className="reward-cost"><Sparkles size={14} />{reward.cost} XP</span><h3>{reward.name}</h3><button className="button button-secondary full-button" onClick={() => onRedeem(reward)} disabled={xp < reward.cost}>{xp >= reward.cost ? 'Redeem reward' : `Need ${reward.cost - xp} more XP`}</button></div></article>)}</div> : <EmptyState icon={Heart} title="What feels rewarding to you?" detail="Create personal rewards that make consistency feel worth celebrating." action={<button className="button button-secondary" onClick={onAdd}><Plus size={16} />Create a reward</button>} />}
    <section className="redemption-section"><div className="section-title-row"><div><h2>Redemption history</h2><p>Redemptions remain permanent even if past habits are edited.</p></div></div>{redemptions.length ? <div className="redemption-list">{[...redemptions].reverse().map((item) => <div className="redemption-row" key={item.id}><span className="redemption-icon"><Trophy size={17} /></span><div><strong>{item.rewardName}</strong><small>{format(new Date(item.date), 'MMM d, yyyy · h:mm a')}</small></div><b>−{item.cost} XP</b></div>)}</div> : <p className="subtle-empty">Your redeemed rewards will show up here.</p>}</section>
  </>
}

function InsightsPage({ habits, occurrences }) {
  const [period, setPeriod] = useState(7)
  const chartData = Array.from({ length: period }, (_, index) => {
    const date = addDays(subDays(today(), period - 1), index)
    const summary = summarizeDate(habits, occurrences, date)
    return { label: format(date, 'EEE'), percentage: summary.rate ?? 0, count: summary.eligible ? `${summary.completed}/${summary.eligible}` : '—' }
  })
  const start = subDays(today(), period - 1)
  const totals = summarizeRange(habits, occurrences, start, today())
  const ranked = habits.map((habit) => ({ habit, ...streakStats(habit, occurrences) })).sort((a, b) => b.rate - a.rate)
  return <>
    <PageHeading eyebrow="SLOW AND STEADY" title="Insights" subtitle="Patterns you can use, without turning progress into pressure." />
    <div className="insight-summary-row"><article className="insight-summary"><span>Completion rate</span><strong>{totals.rate === null ? '—' : `${totals.rate}%`}</strong><small>{totals.completed} of {totals.eligible} scheduled occurrences</small></article><article className="insight-summary"><span>Habit count</span><strong>{habits.length}</strong><small>Active routines</small></article><article className="insight-summary"><span>Most consistent</span><strong>{ranked.find((item) => item.rate !== null)?.habit.name ?? '—'}</strong><small>In the selected period</small></article></div>
    <section className="panel chart-panel"><div className="chart-header"><div><h2>Completion trend</h2><p>Completed scheduled habits each day</p></div><div className="segmented"><button className={period === 7 ? 'selected' : ''} onClick={() => setPeriod(7)}>7 days</button><button className={period === 30 ? 'selected' : ''} onClick={() => setPeriod(30)}>30 days</button></div></div>{totals.eligible ? <div className="chart-container"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 12, right: 10, bottom: 0, left: -18 }}><CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--line)" /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} interval={period === 30 ? 4 : 0} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={(value) => `${value}%`} /><Tooltip formatter={(value, _name, item) => [`${value}% (${item.payload.count})`, 'Completion']} contentStyle={{ borderRadius: 8, borderColor: 'var(--line)', background: 'var(--surface)' }} /><Line type="monotone" dataKey="percentage" stroke="var(--green)" strokeWidth={2.5} dot={{ fill: 'var(--green)', r: period === 7 ? 4 : 2 }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></div> : <EmptyState icon={BarChart3} title="Your trend will take shape" detail="Complete a few scheduled habits and your progress will appear here." />}</section>
    <section className="panel consistency-panel"><div className="panel-heading"><div><h2>Habit consistency</h2><p>Based on scheduled days, excluding excused occurrences.</p></div><Target size={17} className="muted-icon" /></div>{ranked.length ? ranked.map(({ habit, current, best, rate, successes }) => <div className="consistency-row" key={habit.id}><span className="habit-emoji">{habit.icon}</span><div className="consistency-name"><strong>{habit.name}</strong><div className="mini-meter"><span style={{ width: `${rate ?? 0}%` }} /></div></div><span>{rate === null ? '—' : `${rate}%`}</span><small>{successes} days</small><small><Flame size={13} />{current}/{best}</small></div>) : <p className="subtle-empty">Add habits to see personal consistency insights.</p>}</section>
  </>
}

function SettingsPage({ state, onSetting, onExport, onImport, onReset }) {
  const settings = state.settings
  return <>
    <PageHeading eyebrow="MAKE IT YOURS" title="Settings" subtitle="A few quiet preferences for how your tracker works." />
    <div className="settings-layout"><section className="settings-main">
      <div className="settings-group"><div className="settings-group-heading"><Sun size={18} /><div><h2>Appearance</h2><p>Choose a comfortable look.</p></div></div><div className="settings-control-row"><div><strong>Theme</strong><span>Light or low-glare dark mode</span></div><div className="segmented"><button className={settings.theme === 'light' ? 'selected' : ''} onClick={() => onSetting('theme', 'light')}><Sun size={14} />Light</button><button className={settings.theme === 'dark' ? 'selected' : ''} onClick={() => onSetting('theme', 'dark')}><Moon size={14} />Dark</button></div></div></div>
      <div className="settings-group"><div className="settings-group-heading"><CalendarDays size={18} /><div><h2>Tracking rules</h2><p>Set the rules behind your numbers.</p></div></div><div className="settings-control-row"><div><strong>Week starts on</strong><span>Used in your calendar</span></div><select value={settings.weekStartsOn} onChange={(event) => onSetting('weekStartsOn', Number(event.target.value))}><option value={1}>Monday</option><option value={0}>Sunday</option></select></div><div className="settings-control-row"><div><strong>Daily completion target</strong><span>A personal benchmark for scheduled habits</span></div><div className="number-setting"><input type="number" min="0" max="100" value={settings.dailyTarget} onChange={(event) => onSetting('dailyTarget', Math.min(100, Math.max(0, Number(event.target.value))))} /><span>%</span></div></div><div className="settings-control-row"><div><strong>Recovery window</strong><span>Past calendar days eligible for recovery</span></div><select value={settings.recoveryDays} onChange={(event) => onSetting('recoveryDays', Number(event.target.value))}>{[0, 1, 2, 3, 5, 7].map((days) => <option value={days} key={days}>{days} {days === 1 ? 'day' : 'days'}</option>)}</select></div><div className="settings-info"><CircleHelp size={16} /><span>Excused occurrences are excluded from completion rates and do not break a streak. A missed scheduled day breaks a streak.</span></div></div>
      <div className="settings-group"><div className="settings-group-heading"><Sparkles size={18} /><div><h2>Points</h2><p>Keep rewards transparent and predictable.</p></div></div><div className="settings-control-row"><div><strong>XP per completion</strong><span>Awarded once per completed habit occurrence</span></div><div className="number-setting"><input type="number" min="0" max="100" value={settings.xpPerCompletion} onChange={(event) => onSetting('xpPerCompletion', Math.min(100, Math.max(0, Number(event.target.value))))} /><span>XP</span></div></div><div className="settings-control-row"><div><strong>Daily completion bonus</strong><span>For completing every habit scheduled that day</span></div><div className="number-setting"><input type="number" min="0" max="100" value={settings.dailyBonus} onChange={(event) => onSetting('dailyBonus', Math.min(100, Math.max(0, Number(event.target.value))))} /><span>XP</span></div></div><div className="settings-info"><ShieldCheck size={16} /><span>XP changes are recorded in an auditable ledger. Reward redemptions are permanent and are not reversed by edits.</span></div></div>
      <div className="settings-group"><div className="settings-group-heading"><Bell size={18} /><div><h2>Reminders</h2><p>Reminder times are stored with habits.</p></div></div><div className="settings-info"><CircleHelp size={16} /><span>This version does not send notifications. Browser reminders require notification permission and reliable background support, which vary by device.</span></div></div>
      <div className="settings-group data-group"><div className="settings-group-heading"><ShieldCheck size={18} /><div><h2>Your data</h2><p>Stored locally in this browser, not cloud-synchronized.</p></div></div><div className="settings-control-row"><div><strong>Export backup</strong><span>Download your habits, history, and rewards as JSON.</span></div><button className="button button-secondary" onClick={onExport}><ArrowDownToLine size={16} />Export JSON</button></div><div className="settings-control-row"><div><strong>Restore backup</strong><span>Validate a version 1 backup before replacing data.</span></div><label className="button button-secondary import-button"><ArrowDownToLine size={16} />Import JSON<input type="file" accept="application/json,.json" onChange={onImport} /></label></div><div className="settings-control-row reset-row"><div><strong>Reset application data</strong><span>This permanently deletes all local data.</span></div><button className="button button-danger" onClick={onReset}><Trash2 size={15} />Reset data</button></div><p className="backup-reminder">A browser reset or clearing site data will remove your tracker. Keep a regular JSON backup.</p></div>
    </section><aside className="settings-aside"><div className="aside-art"><div className="art-sun" /><div className="art-hill hill-one" /><div className="art-hill hill-two" /><span>GROW AT YOUR OWN PACE</span></div><div className="data-card"><ShieldCheck size={18} /><strong>Private by default</strong><p>Your habit records live on this device. They are not uploaded or synced anywhere.</p></div></aside></div>
  </>
}

function EmptyState({ icon: Icon, title, detail, action }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={21} /></span><h3>{title}</h3><p>{detail}</p>{action}</div>
}

function HabitModal({ habit, onClose, onSave }) {
  const [name, setName] = useState(habit?.name ?? '')
  const [description, setDescription] = useState(habit?.description ?? '')
  const [category, setCategory] = useState(habit?.category ?? categories[0])
  const [icon, setIcon] = useState(habit?.icon ?? iconOptions[0])
  const [scheduleType, setScheduleType] = useState(habit?.schedule?.type ?? 'daily')
  const [days, setDays] = useState((habit?.schedule?.days ?? []).map((day) => weekdays[day]))
  const [reminder, setReminder] = useState(habit?.reminder ?? '')
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    if (name.trim().length < 2) return setError('Use at least 2 characters for the habit name.')
    if (scheduleType === 'custom' && !days.length) return setError('Choose at least one day for a custom schedule.')
    onSave({ id: habit?.id, name, description, category, icon, scheduleType, days, reminder, startDate: habit?.startDate })
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><form className="form-modal" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="habit-modal-title"><button type="button" className="icon-button modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button><p className="eyebrow">A ROUTINE TO RETURN TO</p><h2 id="habit-modal-title">{habit ? 'Edit habit' : 'Create a habit'}</h2><label className="field-label">Name<input autoFocus maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Read a few pages" /></label><label className="field-label">Description <span>Optional</span><textarea maxLength={180} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Make it easy to remember why this matters." rows={2} /></label><div className="field-row"><label className="field-label">Category<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label className="field-label">Reminder <span>Optional</span><input type="time" value={reminder} onChange={(event) => setReminder(event.target.value)} /></label></div><div className="field-label">Choose an icon<div className="icon-choices">{iconOptions.map((item) => <button type="button" key={item} className={icon === item ? 'chosen' : ''} onClick={() => setIcon(item)} aria-label={`Choose ${item}`} aria-pressed={icon === item}>{item}</button>)}</div></div><fieldset className="schedule-field"><legend>Schedule</legend><div className="schedule-options">{[['daily', 'Every day'], ['weekdays', 'Weekdays'], ['custom', 'Choose days']].map(([value, label]) => <label key={value} className={scheduleType === value ? 'selected' : ''}><input type="radio" name="schedule" value={value} checked={scheduleType === value} onChange={() => setScheduleType(value)} />{label}</label>)}</div>{scheduleType === 'custom' && <div className="weekday-choices">{weekdays.map((day) => <button type="button" key={day} className={days.includes(day) ? 'chosen' : ''} onClick={() => setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day])} aria-pressed={days.includes(day)}>{day.slice(0, 1)}</button>)}</div>}</fieldset>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary">{habit ? 'Save changes' : 'Create habit'}</button></div></form></div>
}

function RewardModal({ onClose, onSave }) {
  const [name, setName] = useState('')
  const [cost, setCost] = useState('50')
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    if (!name.trim()) return setError('Give your reward a name.')
    if (!Number.isInteger(Number(cost)) || Number(cost) < 1) return setError('Cost must be at least 1 XP.')
    onSave({ name, cost })
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><form className="form-modal small-modal" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="reward-modal-title"><button type="button" className="icon-button modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button><div className="modal-icon mint"><Heart size={19} /></div><p className="eyebrow">A REASON TO CELEBRATE</p><h2 id="reward-modal-title">Create a reward</h2><label className="field-label">Reward name<input autoFocus maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder="A slow Sunday morning" /></label><label className="field-label">XP cost<div className="number-setting wide"><input aria-label="XP cost" type="number" min="1" value={cost} onChange={(event) => setCost(event.target.value)} /><span>XP</span></div></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary">Add reward</button></div></form></div>
}

export default App
