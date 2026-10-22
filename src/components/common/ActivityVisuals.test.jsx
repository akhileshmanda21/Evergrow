import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { localDateKey } from '../../domain.js'
import ActivityHeatmap from './ActivityHeatmap.jsx'
import ProgressRing from './ProgressRing.jsx'

const todayKey = localDateKey(new Date())
const habit = {
  id: 'habit-1',
  name: 'Read',
  archived: false,
  startDate: todayKey,
  schedule: { type: 'daily' },
}

describe('data-driven progress visuals', () => {
  it('shows a helpful heatmap empty state without completed records', () => {
    render(<ActivityHeatmap habits={[]} occurrences={[]} />)

    expect(screen.getByText('Start with a habit')).toBeInTheDocument()
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
  })

  it('shows historical activity derived from completed occurrences', () => {
    render(
      <ActivityHeatmap
        habits={[habit]}
        occurrences={[
          {
            id: 'occurrence-1',
            habitId: habit.id,
            date: todayKey,
            status: 'completed',
          },
        ]}
      />,
    )

    expect(
      screen.getByLabelText(/1 of 1 eligible habits completed/),
    ).toBeInTheDocument()
    expect(
      screen.getAllByTitle(/eligible habits completed/).length,
    ).toBeGreaterThan(0)
  })

  it('reports real completion percentage and a no-occurrences state', () => {
    const { rerender } = render(
      <ProgressRing completed={0} total={0} percentage={null} />,
    )
    expect(
      screen.getByRole('img', { name: 'No habits scheduled today' }),
    ).toBeInTheDocument()

    rerender(<ProgressRing completed={1} total={2} percentage={50} />)
    expect(
      screen.getByRole('img', {
        name: '50% complete, 1 of 2 scheduled habits',
      }),
    ).toBeInTheDocument()
  })
})
