import { useEffect } from 'react'

interface KeyboardShortcutOptions {
  key: string
  mod?: boolean
  onTrigger: () => void
}

export function useKeyboardShortcut({
  key,
  mod = false,
  onTrigger,
}: KeyboardShortcutOptions): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const modPressed = event.metaKey || event.ctrlKey
      if (mod && !modPressed) {
        return
      }

      if (event.key.toLowerCase() !== key.toLowerCase()) {
        return
      }

      event.preventDefault()
      onTrigger()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [key, mod, onTrigger])
}
