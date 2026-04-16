import { motion } from 'motion/react'

interface ToggleProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled?: boolean
}

export const Toggle = ({ enabled, onChange, disabled }: ToggleProps) => {
  return (
    <button
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`w-11 h-6 rounded-full p-1 transition-colors ${enabled ? 'bg-accent' : 'bg-surface2'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <motion.div
        animate={{ x: enabled ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="w-4 h-4 bg-white rounded-full shadow-sm"
      />
    </button>
  )
}
