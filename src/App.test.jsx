import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { createEmptyState, saveState } from './storage.js'

beforeEach(async () => {
  vi.stubGlobal(
    'confirm',
    vi.fn(() => true),
  )
  await saveState(createEmptyState())
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('habit tracker workflow', () => {
  it('moves focus into a dialog and restores it when Escape closes the dialog', async () => {
    const user = userEvent.setup()
    render(<App />)
    const addButton = await screen.findByRole('button', {
      name: 'Add your first habit',
    })

    await user.click(addButton)
    expect(screen.getByLabelText('Name')).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(addButton).toHaveFocus()
  })

  it('creates a habit, awards XP once, allows undo, and persists across remounts', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await user.click(
      await screen.findByRole('button', { name: 'Add your first habit' }),
    )
    await user.type(screen.getByLabelText('Name'), 'Drink water')
    await user.click(screen.getByRole('button', { name: 'Create habit' }))

    const checkIn = await screen.findByRole('button', {
      name: 'Complete Drink water',
    })
    await user.click(checkIn)
    expect(await screen.findAllByText('15 XP')).toHaveLength(2)

    await user.click(
      within(screen.getByRole('complementary')).getByRole('button', {
        name: 'Settings',
      }),
    )
    const xpInput = screen.getByDisplayValue('10')
    await user.clear(xpInput)
    await user.type(xpInput, '20')
    await user.click(screen.getByRole('button', { name: /^Today/ }))

    await user.click(
      screen.getByRole('button', { name: 'Undo completion of Drink water' }),
    )
    expect(await screen.findAllByText('0 XP')).toHaveLength(2)
    await user.click(
      screen.getByRole('button', { name: 'Complete Drink water' }),
    )
    expect(await screen.findAllByText('15 XP')).toHaveLength(2)

    unmount()
    render(<App />)
    expect(await screen.findByText('Drink water')).toBeInTheDocument()
    expect(await screen.findAllByText('15 XP')).toHaveLength(2)
  })

  it('keeps a custom schedule valid by requiring at least one selected day', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'New habit' }))
    await user.type(screen.getByLabelText('Name'), 'Stretch')
    await user.click(screen.getByLabelText('Choose days'))
    await user.click(screen.getByRole('button', { name: 'Create habit' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Choose at least one day',
    )
  })

  it('disables scheduled check-ins on future calendar dates', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(
      await screen.findByRole('button', { name: 'Add your first habit' }),
    )
    await user.type(screen.getByLabelText('Name'), 'Future check-in')
    await user.click(screen.getByRole('button', { name: 'Create habit' }))
    await user.click(screen.getByRole('button', { name: 'Calendar' }))
    await user.click(
      await screen.findByRole('button', {
        name: 'October 23, 0 of 1 complete',
      }),
    )
    expect(
      await screen.findByRole('button', { name: 'Complete Future check-in' }),
    ).toBeDisabled()
  })

  it('edits, archives, restores, and deletes a habit through existing controls', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(
      await screen.findByRole('button', { name: 'Add your first habit' }),
    )
    await user.type(screen.getByLabelText('Name'), 'Morning walk')
    await user.click(screen.getByRole('button', { name: 'Create habit' }))

    await user.click(screen.getByRole('button', { name: 'Habits' }))
    await user.click(screen.getByRole('button', { name: 'Edit Morning walk' }))
    const nameInput = screen.getByLabelText('Name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Evening walk')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Evening walk')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Archive Evening walk' }),
    )
    await user.click(screen.getByRole('button', { name: 'Show archived' }))
    expect(screen.getByText('Evening walk')).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Restore Evening walk' }),
    )
    expect(
      screen.getByRole('button', { name: 'Archive Evening walk' }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Archive Evening walk' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Delete Evening walk' }),
    )
    expect(await screen.findByText('No habits here yet')).toBeInTheDocument()
  })

  it('persists the selected theme in existing settings', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await user.click(
      await screen.findByRole('button', { name: 'Toggle color theme' }),
    )
    expect(document.querySelector('.app-shell')).toHaveClass('theme-dark')

    unmount()
    render(<App />)
    expect(
      await screen.findByRole('button', { name: 'Toggle color theme' }),
    ).toBeInTheDocument()
    expect(document.querySelector('.app-shell')).toHaveClass('theme-dark')
  })

  it('redeems a personal reward from the earned balance', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(
      await screen.findByRole('button', { name: 'Add your first habit' }),
    )
    await user.type(screen.getByLabelText('Name'), 'Take a walk')
    await user.click(screen.getByRole('button', { name: 'Create habit' }))
    await user.click(
      await screen.findByRole('button', { name: 'Complete Take a walk' }),
    )
    await user.click(screen.getByRole('button', { name: 'Rewards' }))
    await user.click(screen.getByRole('button', { name: 'Add reward' }))
    await user.type(screen.getByLabelText('Reward name'), 'A favorite tea')
    await user.clear(screen.getByLabelText('XP cost'))
    await user.type(screen.getByLabelText('XP cost'), '1')
    await user.click(
      within(screen.getByRole('dialog', { name: 'Create a reward' })).getByRole(
        'button',
        { name: 'Add reward' },
      ),
    )
    await user.click(
      await screen.findByRole('button', { name: 'Redeem reward' }),
    )
    expect(await screen.findByText('14 XP')).toBeInTheDocument()
    expect(screen.getAllByText('A favorite tea')).toHaveLength(2)
  })
})
