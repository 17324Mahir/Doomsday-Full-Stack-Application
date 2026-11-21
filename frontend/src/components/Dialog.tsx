import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

type Props = { title: string; onClose: () => void; children: ReactNode; busy?: boolean }

export default function Dialog({ title, onClose, children, busy }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = previous
    }
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-heading"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
    >
      <div className="dialog-content">
        <div className="dialog-header">
          <h2 id="dialog-heading">{title}</h2>
          <button
            className="icon-button"
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            disabled={busy}
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
