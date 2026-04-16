import { Bell, LogOut, User } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../ui/Avatar'

export const TopBar = () => {
  const { type, owner, staff, cafe } = useAuthStore()
  const name = type === 'owner' ? owner?.user_metadata?.full_name || 'Owner' : staff?.name || 'Staff'

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-[#080b12]/92 backdrop-blur-md border-b border-border z-[100] flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <span className="text-base font-bold text-text font-sans">Nook OS</span>
      </div>

      <div className="text-[13px] font-medium text-text2 font-sans">
        {new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date()).replace('.', '')}
      </div>

      <div className="flex items-center gap-3">
        {type === 'owner' && (
          <button className="relative p-1 text-text2 hover:text-text transition-colors">
            <Bell size={20} />
            <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-accent rounded-full border border-bg" />
          </button>
        )}
        <Avatar name={name} size={32} />
      </div>
    </header>
  )
}
