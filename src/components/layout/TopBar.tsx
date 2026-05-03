import { LogOut, Settings, Users } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { useNavigate, Link } from 'react-router-dom'
import { GlobalSearch } from './GlobalSearch'
import { useEffect, useState } from 'react'

export const TopBar = () => {
  const { type, staff, cafe, logout } = useAuthStore()
  const navigate = useNavigate()
  const [logoBase64, setLogoBase64] = useState<string | null>(null)

  const hasSettings = type === 'owner' || !!staff?.permissions?.settings;
  const hasClients = type === 'owner' || !!staff?.permissions?.clients;

  useEffect(() => {
    const logo = localStorage.getItem('nook_logo')
    if (logo) {
      setLogoBase64(logo)
    }
  }, [])

  const handleLogout = async () => {
    if (type === 'owner') {
      await supabase.auth.signOut()
    }
    logout()
    navigate('/login')
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-14 z-[100] flex items-center justify-between px-4">
      {/* Background with backdrop-blur moved to an absolute child to prevent containing block issues for fixed children */}
      <div className="absolute inset-0 bg-bg/90 backdrop-blur-xl border-b border-border -z-10" />
      
      <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        {logoBase64 ? (
           <img src={logoBase64} alt={cafe?.name} className="w-8 h-8 object-contain rounded-md drop-shadow-sm" />
        ) : (
           <div className="w-8 h-8 bg-accent text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-[0_2px_10px_rgba(249,115,22,0.3)]">
             {cafe?.name?.charAt(0).toUpperCase() || 'N'}
           </div>
        )}
      </Link>

      <div className="text-sm font-semibold text-text absolute left-1/2 -translate-x-1/2 max-w-[150px] sm:max-w-[200px] truncate text-center">
        {cafe?.name || 'Nook OS'}
      </div>

      <div className="flex items-center gap-1">
        <GlobalSearch />
        
        {hasSettings ? (
          <button 
            onClick={() => navigate('/settings')}
            className="w-8 h-8 ml-2 flex items-center justify-center rounded-full bg-surface2 text-text2 hover:text-text transition-colors"
          >
            <Settings size={18} />
          </button>
        ) : hasClients ? (
          <button 
            onClick={() => navigate('/clients')}
            className="w-8 h-8 ml-2 flex items-center justify-center rounded-full bg-surface2 text-text2 hover:text-text transition-colors"
          >
            <Users size={18} />
          </button>
        ) : null}

        {type === 'staff' && (
          <button 
            onClick={handleLogout}
            className="p-2 ml-1 text-text3 hover:text-error transition-colors"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </header>
  )
}
