import {
  ArrowDownToLine,
  Bell,
  CalendarDays,
  CircleHelp,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
} from 'lucide-react'
import PageHeading from '../components/common/PageHeading.jsx'

export default function SettingsPage({
  state,
  onSetting,
  onExport,
  onImport,
  onReset,
}) {
  const settings = state.settings

  return (
    <>
      <PageHeading
        eyebrow="MAKE IT YOURS"
        title="Settings"
        subtitle="A few quiet preferences for how your tracker works."
      />
      <div className="settings-layout">
        <section className="settings-main">
          <div className="settings-group">
            <div className="settings-group-heading">
              <Sun size={18} />
              <div>
                <h2>Appearance</h2>
                <p>Choose a comfortable look.</p>
              </div>
            </div>
            <div className="settings-control-row">
              <div>
                <strong>Theme</strong>
                <span>Light or low-glare dark mode</span>
              </div>
              <div className="segmented">
                <button
                  className={settings.theme === 'light' ? 'selected' : ''}
                  onClick={() => onSetting('theme', 'light')}
                >
                  <Sun size={14} />
                  Light
                </button>
                <button
                  className={settings.theme === 'dark' ? 'selected' : ''}
                  onClick={() => onSetting('theme', 'dark')}
                >
                  <Moon size={14} />
                  Dark
                </button>
              </div>
            </div>
          </div>
          <div className="settings-group">
            <div className="settings-group-heading">
              <CalendarDays size={18} />
              <div>
                <h2>Tracking rules</h2>
                <p>Set the rules behind your numbers.</p>
              </div>
            </div>
            <div className="settings-control-row">
              <div>
                <strong>Week starts on</strong>
                <span>Used in your calendar</span>
              </div>
              <select
                value={settings.weekStartsOn}
                onChange={(event) =>
                  onSetting('weekStartsOn', Number(event.target.value))
                }
              >
                <option value={1}>Monday</option>
                <option value={0}>Sunday</option>
              </select>
            </div>
            <div className="settings-control-row">
              <div>
                <strong>Daily completion target</strong>
                <span>A personal benchmark for scheduled habits</span>
              </div>
              <div className="number-setting">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.dailyTarget}
                  onChange={(event) =>
                    onSetting(
                      'dailyTarget',
                      Math.min(100, Math.max(0, Number(event.target.value))),
                    )
                  }
                />
                <span>%</span>
              </div>
            </div>
            <div className="settings-control-row">
              <div>
                <strong>Recovery window</strong>
                <span>Past calendar days eligible for recovery</span>
              </div>
              <select
                value={settings.recoveryDays}
                onChange={(event) =>
                  onSetting('recoveryDays', Number(event.target.value))
                }
              >
                {[0, 1, 2, 3, 5, 7].map((days) => (
                  <option value={days} key={days}>
                    {days} {days === 1 ? 'day' : 'days'}
                  </option>
                ))}
              </select>
            </div>
            <div className="settings-info">
              <CircleHelp size={16} />
              <span>
                Excused occurrences are excluded from completion rates and do
                not break a streak. A missed scheduled day breaks a streak.
              </span>
            </div>
          </div>
          <div className="settings-group">
            <div className="settings-group-heading">
              <Sparkles size={18} />
              <div>
                <h2>Points</h2>
                <p>Keep rewards transparent and predictable.</p>
              </div>
            </div>
            <div className="settings-control-row">
              <div>
                <strong>XP per completion</strong>
                <span>Awarded once per completed habit occurrence</span>
              </div>
              <div className="number-setting">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.xpPerCompletion}
                  onChange={(event) =>
                    onSetting(
                      'xpPerCompletion',
                      Math.min(100, Math.max(0, Number(event.target.value))),
                    )
                  }
                />
                <span>XP</span>
              </div>
            </div>
            <div className="settings-control-row">
              <div>
                <strong>Daily completion bonus</strong>
                <span>For completing every habit scheduled that day</span>
              </div>
              <div className="number-setting">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.dailyBonus}
                  onChange={(event) =>
                    onSetting(
                      'dailyBonus',
                      Math.min(100, Math.max(0, Number(event.target.value))),
                    )
                  }
                />
                <span>XP</span>
              </div>
            </div>
            <div className="settings-info">
              <ShieldCheck size={16} />
              <span>
                XP changes are recorded in an auditable ledger. Reward
                redemptions are permanent and are not reversed by edits.
              </span>
            </div>
          </div>
          <div className="settings-group">
            <div className="settings-group-heading">
              <Bell size={18} />
              <div>
                <h2>Reminders</h2>
                <p>Reminder times are stored with habits.</p>
              </div>
            </div>
            <div className="settings-info">
              <CircleHelp size={16} />
              <span>
                This version does not send notifications. Browser reminders
                require notification permission and reliable background support,
                which vary by device.
              </span>
            </div>
          </div>
          <div className="settings-group data-group">
            <div className="settings-group-heading">
              <ShieldCheck size={18} />
              <div>
                <h2>Your data</h2>
                <p>Stored locally in this browser, not cloud-synchronized.</p>
              </div>
            </div>
            <div className="settings-control-row">
              <div>
                <strong>Export backup</strong>
                <span>Download your habits, history, and rewards as JSON.</span>
              </div>
              <button className="button button-secondary" onClick={onExport}>
                <ArrowDownToLine size={16} />
                Export JSON
              </button>
            </div>
            <div className="settings-control-row">
              <div>
                <strong>Restore backup</strong>
                <span>Validate a version 1 backup before replacing data.</span>
              </div>
              <label className="button button-secondary import-button">
                <ArrowDownToLine size={16} />
                Import JSON
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={onImport}
                />
              </label>
            </div>
            <div className="settings-control-row reset-row">
              <div>
                <strong>Reset application data</strong>
                <span>This permanently deletes all local data.</span>
              </div>
              <button className="button button-danger" onClick={onReset}>
                <Trash2 size={15} />
                Reset data
              </button>
            </div>
            <p className="backup-reminder">
              A browser reset or clearing site data will remove your tracker.
              Keep a regular JSON backup.
            </p>
          </div>
        </section>
        <aside className="settings-aside">
          <div className="aside-art">
            <div className="art-sun" />
            <div className="art-hill hill-one" />
            <div className="art-hill hill-two" />
            <span>GROW AT YOUR OWN PACE</span>
          </div>
          <div className="data-card">
            <ShieldCheck size={18} />
            <strong>Private by default</strong>
            <p>
              Your habit records live on this device. They are not uploaded or
              synced anywhere.
            </p>
          </div>
        </aside>
      </div>
    </>
  )
}
