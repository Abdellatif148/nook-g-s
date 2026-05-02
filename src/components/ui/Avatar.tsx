import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg' | number
  className?: string
}

export const Avatar = ({ name, size = 'md', className }: AvatarProps) => {
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
    const colors = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#db2777']
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  const color = getColor(name)
  const initials = getInitials(name)

  const sizes = {
    sm: { className: 'h-8 w-8 text-[10px]' },
    md: { className: 'h-10 w-10 text-xs' },
    lg: { className: 'h-16 w-16 text-lg' },
  }

  const isNumeric = typeof size === 'number'

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-bold border shrink-0',
        !isNumeric && sizes[size as keyof typeof sizes].className,
        className
      )}
      style={{
        backgroundColor: `${color}26`, // 15% opacity
        borderColor: `${color}4d`, // 30% opacity
        color: color,
        ...(isNumeric ? { width: size, height: size, fontSize: (size as number) * 0.4 } : {})
      }}
    >
      {initials}
    </div>
  )
}
