import { motion, AnimatePresence } from 'motion/react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface PINDotsProps {
  length: number
  maxLength?: number
  className?: string
  error?: boolean
}

export const PINDots = ({ length, maxLength = 4, className, error }: PINDotsProps) => {
  return (
    <motion.div
      animate={error ? { x: [-8, 8, -6, 6, 0] } : {}}
      transition={{ duration: 0.4 }}
      className={cn('flex justify-center gap-4', className)}
    >
      {Array.from({ length: maxLength }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-[14px] h-[14px] rounded-full border-2 transition-all duration-200 flex items-center justify-center',
            i < length
              ? 'bg-accent border-accent'
              : 'border-border'
          )}
        >
          <AnimatePresence>
            {i < length && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 600, damping: 25 }}
                className="w-full h-full bg-accent rounded-full"
              />
            )}
          </AnimatePresence>
        </div>
      ))}
    </motion.div>
  )
}
