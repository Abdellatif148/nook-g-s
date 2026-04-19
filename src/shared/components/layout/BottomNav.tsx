import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  History,
  Users,
  Settings
} from 'lucide-react'
import { useTranslation } from '../../../shared/hooks/useTranslation'
import { useAuthStore } from '../../../stores/authStore'

export const BottomNav = () => {
  const { t } = useTranslation()
  const { type, staff } = useAuthStore()

  const hasPermission = (perm: 'reports' | 'clients') => {
    if (type === 'owner') return true
    if (!staff?.permissions) return false
    const perms = staff.permissions as any
    return perms[perm]
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-bg/95 backdrop-blur-lg border-t border-border z-[100] px-6 flex items-center justify-between pb-safe">
      <NavLink
        to="/dashboard"
        className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-accent' : 'text-text3'}`}
      >
        <LayoutDashboard size={20} />
        <span className="text-[10px] font-bold uppercase tracking-wider">{t('nav.dashboard') || 'Dashboard'}</span>
      </NavLink>

      <NavLink
        to="/sessions"
        className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-accent' : 'text-text3'}`}
      >
        <History size={20} />
        <span className="text-[10px] font-bold uppercase tracking-wider">{t('nav.history') || 'Historique'}</span>
      </NavLink>

      {hasPermission('clients') && (
        <NavLink
          to="/clients"
          className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-accent' : 'text-text3'}`}
        >
          <Users size={20} />
          <span className="text-[10px] font-bold uppercase tracking-wider">{t('nav.clients') || 'Clients'}</span>
        </NavLink>
      )}

      {type === 'owner' && (
        <NavLink
          to="/settings"
          className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-accent' : 'text-text3'}`}
        >
          <Settings size={20} />
          <span className="text-[10px] font-bold uppercase tracking-wider">{t('nav.settings') || 'Réglages'}</span>
        </NavLink>
      )}
    </nav>
  )
}
