import { motion } from 'motion/react'
import { Delete, Check } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface NumPadProps {
  onPress: (val: string) => void
  onDelete: () => void
  onConfirm?: () => void
  showConfirm?: boolean
  className?: string
}

export const NumPad = ({ onPress, onDelete, onConfirm, showConfirm, className }: NumPadProps) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'delete', '0', 'confirm']

  return (
    <div className={cn('grid grid-cols-3 gap-2.5', className)}>
      {keys.map((key) => {
        if (key === 'delete') {
          return (
            <motion.button
              key={key}
              whileTap={{ scale: 0.90 }}
              onClick={onDelete}
              className="h-[58px] flex items-center justify-center bg-surface2 border border-border rounded-[10px] text-text2 active:bg-accent-glow"
            >
              <Delete size={20} />
            </motion.button>
          )
        }
        if (key === 'confirm') {
          return (
            <motion.button
              key={key}
              whileTap={{ scale: 0.90 }}
              onClick={onConfirm}
              disabled={!showConfirm}
              className={cn(
                'h-[58px] flex items-center justify-center bg-surface2 border border-border rounded-[10px] transition-all active:bg-accent-glow',
                showConfirm ? 'text-success' : 'text-text3 opacity-0 pointer-events-none'
              )}
            >
              <Check size={20} />
            </motion.button>
          )
        }
        return (
          <motion.button
            key={key}
            whileTap={{ scale: 0.90 }}
            onClick={() => onPress(key)}
            className="h-[58px] flex items-center justify-center bg-surface2 border border-border rounded-[10px] text-text font-mono text-[22px] font-semibold active:bg-accent-glow"
          >
            {key}
          </motion.button>
        )
      })}
    </div>
  )
}
