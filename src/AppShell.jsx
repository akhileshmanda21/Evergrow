import {
  Activity,
  BarChart3,
  CalendarDays,
  Check,
  CircleHelp,
  ListChecks,
  Moon,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import './achievements.css'
import './mobile-settings.css'
import HabitModal from './components/forms/HabitModal.jsx'
import RewardModal from './components/forms/RewardModal.jsx'
import RecoveryDialog from './components/RecoveryDialog.jsx'
import CalendarPage from './pages/CalendarPage.jsx'
import HabitsPage from './pages/HabitsPage.jsx'
import InsightsPage from './pages/InsightsPage.jsx'
import RewardsPage from './pages/RewardsPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import TodayPage from './pages/TodayPage.jsx'
import useHabitTracker from './hooks/useHabitTracker.js'

const navItems = [
  { id: 'today', label: 'Today', icon: ListChecks },
  { id: 'habits', label: 'Habits', icon: Activity },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'rewards', label: 'Rewards', icon: Trophy },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
]

export default function AppShell() {
  const tracker = useHabitTracker()
  const {
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
  } = tracker

  if (!ready || !state) {
    return (
      <div className="loading-screen">
        <div className="loading-mark">
          <TrendingUp size={23} />
        </div>
        <span>Opening your habit garden</span>
      </div>
    )
  }

  const theme = state.settings.theme

  return (
    <div className={`app-shell theme-${theme}`}>
      <aside className="sidebar">
        <a
          className="brand"
          href="#today"
          onClick={(event) => {
            event.preventDefault()
            setPage('today')
          }}
        >
          <span className="brand-mark">
            <TrendingUp size={19} />
          </span>
          <span>
            Riseo<span className="brand-period">.</span>
          </span>
        </a>
        <div className="side-label">YOUR SPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${page === id ? 'active' : ''}`}
              onClick={() => setPage(id)}
              aria-current={page === id ? 'page' : undefined}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {id === 'today' && dateSummary?.scheduled > 0 && (
                <span className="nav-count">
                  {dateSummary.completed}/{dateSummary.scheduled}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="backup-note">
            <ShieldCheck size={16} />
            <span>
              Your data stays on this device. Export a backup from Settings.
            </span>
          </div>
          <button
            className={`nav-item ${page === 'settings' ? 'active' : ''}`}
            onClick={() => setPage('settings')}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
          <div className="profile-row">
            <div className="profile-avatar">Y</div>
            <div>
              <strong>Your space</strong>
              <span>Personal tracker</span>
            </div>
            <button
              className="theme-toggle icon-button"
              onClick={() =>
                updateSettings('theme', theme === 'light' ? 'dark' : 'light')
              }
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark">
              <TrendingUp size={17} />
            </span>
            Riseo<span className="brand-period">.</span>
          </div>
          <div className="breadcrumb">
            Your space <span>/</span>{' '}
            <strong>
              {navItems.find((item) => item.id === page)?.label ?? 'Settings'}
            </strong>
          </div>
          <div className="topbar-right">
            <div className="xp-chip">
              <Sparkles size={15} />
              <span>{xp} XP</span>
            </div>
            <button
              className="icon-button mobile-settings"
              onClick={() => setPage('settings')}
              aria-label="Settings"
            >
              <Settings size={17} />
            </button>
            <button
              className="icon-button top-theme"
              onClick={() =>
                updateSettings('theme', theme === 'light' ? 'dark' : 'light')
              }
              aria-label="Toggle color theme"
            >
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>
          </div>
        </header>
        {storageError && (
          <div role="alert" className="storage-alert">
            <CircleHelp size={17} />
            {storageError}
          </div>
        )}
        <div className="content-wrap">
          {page === 'today' && (
            <TodayPage
              state={state}
              activeHabits={activeHabits}
              date={selectedDate}
              summary={dateSummary}
              xp={xp}
              level={level}
              weekStartsOn={state.settings.weekStartsOn}
              onAdd={() => setModal({ type: 'habit' })}
              onTrack={setOccurrence}
              onDate={setSelectedDate}
              recoveryCandidates={recoveryCandidates}
              onRecover={setRecoveryCandidate}
            />
          )}
          {page === 'habits' && (
            <HabitsPage
              habits={state.habits}
              occurrences={state.occurrences}
              onAdd={() => setModal({ type: 'habit' })}
              onEdit={(habit) => setModal({ type: 'habit', habit })}
              onArchive={archiveHabit}
              onRestore={restoreHabit}
              onDelete={deleteHabit}
            />
          )}
          {page === 'calendar' && (
            <CalendarPage
              habits={state.habits}
              occurrences={state.occurrences}
              weekStartsOn={state.settings.weekStartsOn}
              onSelect={(date) => {
                setSelectedDate(date)
                setPage('today')
              }}
            />
          )}
          {page === 'rewards' && (
            <RewardsPage
              rewards={state.rewards}
              redemptions={state.redemptions}
              xp={xp}
              onAdd={() => setModal({ type: 'reward' })}
              onRedeem={redeem}
            />
          )}
          {page === 'insights' && (
            <InsightsPage
              habits={activeHabits}
              occurrences={state.occurrences}
              weekStartsOn={state.settings.weekStartsOn}
            />
          )}
          {page === 'settings' && (
            <SettingsPage
              state={state}
              onSetting={updateSettings}
              onExport={exportBackup}
              onImport={importBackup}
              onReset={resetData}
            />
          )}
        </div>
      </main>

      {modal?.type === 'habit' && (
        <HabitModal
          habit={modal.habit}
          onClose={() => setModal(null)}
          onSave={saveHabit}
        />
      )}
      {modal?.type === 'reward' && (
        <RewardModal onClose={() => setModal(null)} onSave={createReward} />
      )}
      <RecoveryDialog
        candidate={recoveryCandidate}
        recoveryDays={state.settings.recoveryDays}
        onClose={() => setRecoveryCandidate(null)}
        onConfirm={() => recover()}
      />
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
    </div>
  )
}
