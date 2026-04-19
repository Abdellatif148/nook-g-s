import React from 'react'
import { Bell, Search, User } from 'lucide-react'
import { useAuthStore } from '../../../stores/authStore'
import { useTranslation } from '../../../shared/hooks/useTranslation'

export const TopBar = () => {
  const { cafe, type, owner, staff } = useAuthStore()
  const { t } = useTranslation()

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-bg/92 backdrop-blur-md border-b border-border z-50 flex items-center justify-between px-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white font-black text-lg">N</div>
        <div className="flex flex-col -space-y-0.5">
          <h1 className="text-[13px] font-bold text-text truncate max-w-[120px]">{cafe?.name}</h1>
          <span className="text-[10px] font-medium text-text3 uppercase tracking-wider">
            {type === 'owner' ? owner?.email?.split('@')[0] : staff?.name}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button className="p-2 text-text3 hover:text-text transition-colors">
          <Search size={20} />
        </button>
        <button className="p-2 text-text3 hover:text-text transition-colors relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border-2 border-bg" />
        </button>
      </div>
    </header>
  )
}
