import { useUIStore } from '../../stores/uiStore'
import { AnimatePresence } from 'motion/react'
import { Toast } from './Toast'

export const ToastContainer = () => {
  const toasts = useUIStore((state) => state.toasts)

  return (
    <div className="fixed top-[72px] left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
