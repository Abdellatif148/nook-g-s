import { motion } from 'motion/react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useUIStore, Toast as ToastType } from '../../stores/uiStore'

export const Toast = ({ toast }: { toast: ToastType }) => {
  const removeToast = useUIStore((state) => state.removeToast)

  const icons = {
    success: <CheckCircle2 className="text-success" size={16} />,
    error: <XCircle className="text-error" size={16} />,
    warning: <AlertTriangle className="text-warning" size={16} />,
    info: <Info className="text-info" size={16} />,
  }

  const borderColors = {
    success: 'var(--success)',
    error: 'var(--error)',
    warning: 'var(--warning)',
    info: 'var(--info)',
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center gap-3 px-4 py-3 bg-surface2 border border-border rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.4)] min-w-[260px]"
      style={{ borderLeft: `3px solid ${borderColors[toast.type]}` }}
    >
      <div className="flex-shrink-0">{icons[toast.type]}</div>
      <p className="flex-grow text-[13px] font-medium text-text font-sans">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 text-text3 hover:text-text transition-colors ml-1"
      >
        <X size={14} />
      </button>
    </motion.div>
  )
}
