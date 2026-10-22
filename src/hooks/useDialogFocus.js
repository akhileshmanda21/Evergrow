import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export default function useDialogFocus(onClose, active = true) {
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!active || !dialog) return undefined

    const previousFocus = document.activeElement
    const focusableItems = Array.from(
      dialog.querySelectorAll(FOCUSABLE_SELECTOR),
    )
    const initialFocus =
      dialog.querySelector(
        'input:not([type="file"]):not([disabled]), textarea:not([disabled]), select:not([disabled])',
      ) ??
      focusableItems[0] ??
      dialog
    initialFocus.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const items = Array.from(
        dialog.querySelectorAll(FOCUSABLE_SELECTOR),
      ).filter((item) => !item.hasAttribute('disabled'))
      if (!items.length) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus()
      }
    }
  }, [active])

  return dialogRef
}
