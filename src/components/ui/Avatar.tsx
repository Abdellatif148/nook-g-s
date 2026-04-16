import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface AvatarProps {
  name: string
  size?: number
  className?: string
}

export const Avatar = ({ name, size = 40, className }: AvatarProps) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  const getColor = (name: string) => {
    const colors = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#db2777', '#0891b2']
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  const color = getColor(name)
  const initials = getInitials(name)

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-bold border font-sans',
        className
      )}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${Math.max(10, size / 3)}px`,
        backgroundColor: `${color}33`, // 20% opacity
        borderColor: `${color}66`, // 40% opacity
        color: color,
      }}
    >
      {initials}
    </div>
  )
}
