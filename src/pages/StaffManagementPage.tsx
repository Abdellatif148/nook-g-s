import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { 
  ChevronLeft,
  Plus,
  Users,
  Shield,
  Trash2,
  MoreVertical,
  Check,
  X,
  Share2,
  Lock
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'
import { useTranslation } from '../shared/hooks/useTranslation'
import { Button } from '../shared/components/ui/Button'
import { Input } from '../shared/components/ui/Input'

export default function StaffManagementPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { cafe, type } = useAuthStore()
  const { addToast } = useUIStore()

  const [staffList, setStaffList] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadStaff = async () => {
    if (!cafe) return
    setIsLoading(true)
    const { data } = await supabase.from('staff').select('*').eq('cafe_id', cafe.id).order('created_at')
    setStaffList(data || [])
    setIsLoading(false)
  }

  useEffect(() => {
    loadStaff()
  }, [cafe])

  const handleShareWhatsApp = (member: any) => {
    if (!member.phone) {
        addToast("Ajouter un numéro de téléphone pour partager les accès", "error")
        return
    }

    const cleanPhone = member.phone.replace(/[^0-9]/g, '')
    const message = `Nom: ${member.name}\nIdentifiant: ${member.name}\nPIN: [Votre PIN à 4 chiffres]\nApplication: ${window.location.origin}\n\nBienvenue dans l'équipe Nook !`

    window.open(`whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="fixed top-0 left-0 right-0 h-14 bg-bg/92 backdrop-blur-md border-b border-border z-[100] flex items-center px-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text2 hover:text-text" aria-label="Retour">
          <ChevronLeft size={22} />
        </button>
        <span className="text-base font-bold text-text">Gestion du personnel</span>
      </header>

      <main className="pt-20 px-4 space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-text3 uppercase tracking-widest">{staffList.length} Membres</h2>
            <Button className="h-9 px-4 text-xs">
                <Plus size={14} className="mr-1.5"/> Ajouter
            </Button>
        </div>

        <div className="space-y-3">
            {staffList.map(member => (
                <div key={member.id} className="bg-surface2 border border-border rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                            <Users size={20} />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-text">{member.name}</div>
                            <div className="text-[11px] text-text3 flex items-center gap-1.5">
                                <Lock size={10}/> PIN Configuré
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handleShareWhatsApp(member)}
                            className="p-2 text-text3 hover:text-accent transition-colors"
                            title="Partager les accès"
                        >
                            <Share2 size={18} />
                        </button>
                        <button className="p-2 text-text3 hover:text-text transition-colors">
                            <MoreVertical size={18} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </main>
    </div>
  )
}
