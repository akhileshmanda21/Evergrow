export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const HABIT_CATEGORIES = [
  'Wellbeing',
  'Focus',
  'Movement',
  'Learning',
  'Home',
  'Other',
]
export const HABIT_ICONS = ['🌱', '📖', '💧', '🚶', '🧘', '✍️', '🥗', '🎨']

export const weekdayIndex = (value) => WEEKDAYS.indexOf(value)

export function scheduleLabel(schedule = {}) {
  if (schedule.type === 'daily') return 'Every day'
  if (schedule.type === 'weekdays') return 'Weekdays'
  if (schedule.type === 'custom') {
    return (
      (schedule.days ?? []).map((day) => WEEKDAYS[day]).join(', ') ||
      'No days selected'
    )
  }
  return 'Every day'
}
