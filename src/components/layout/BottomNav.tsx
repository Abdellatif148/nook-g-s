import { Link, useLocation } from 'react-router-dom'
import { Home, Timer, BarChart2, Users, Settings } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from '../../hooks/useTranslation'
import { motion } from 'motion/react'

export const BottomNav = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const { type, staff } = useAuthStore()

  const hasPermission = (perm: 'reports' | 'clients' | 'settings') => {
    if (type === 'owner') return true
    if (!staff?.permissions) return false
    const perms = staff.permissions as any
    return perms[perm]
  }

  const navItems = [
    { icon: Home, label: t('nav.home'), path: '/dashboard', permission: true },
    { icon: Timer, label: t('nav.sessions'), path: '/sessions', permission: true },
    { icon: BarChart2, label: t('nav.report'), path: '/reports', permission: hasPermission('reports') },
    { icon: Users, label: t('nav.clients'), path: '/clients', permission: hasPermission('clients') },
    { icon: Settings, label: t('nav.settings'), path: '/settings', permission: type === 'owner' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[60px] bg-[#080b12]/96 backdrop-blur-md border-t border-border z-[100] flex items-center justify-around px-2 pb-safe">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path
        const Icon = item.icon

        if (!item.permission) {
          return (
            <div key={item.path} className="flex flex-col items-center gap-1 opacity-20 grayscale pointer-events-none">
              <Icon size={20} className="text-text3" />
              <span className="text-[10px] font-medium text-text3">{item.label}</span>
            </div>
          )
        }

        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-1 transition-colors relative ${
              isActive ? 'text-accent2' : 'text-text3 hover:text-text2'
            }`}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium font-sans">{item.label}</span>
            {isActive && (
              <motion.div
                layoutId="nav-dot"
                className="absolute -bottom-[22px] w-1 h-1 bg-accent2 rounded-full"
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
