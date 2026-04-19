import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  Store, DollarSign, Bell, ShoppingBag, Users,
  Key, Globe, User, LogOut, ChevronDown,
  ChevronRight, Copy, RefreshCw, Check, BarChart2,
  ChevronLeft, Save, Phone, UserCircle, List
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { useTranslation, useLanguageStore } from '../../i18n'
import { useAudit } from '../../shared/hooks/useAudit'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { BottomNav } from '../../components/layout/BottomNav'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'

export default function SettingsPage() {
  const { t } = useTranslation()
  const { setLanguage } = useLanguageStore()
  const navigate = useNavigate()
  const { cafe, owner, type, staff, logout, setCafe } = useAuthStore()
  const addToast = useUIStore((state) => state.addToast)
  const { logAction } = useAudit()

  const [expanded, setExpanded] = useState<string | null>(null)
  const [showLogout, setShowLogout] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Venue Identity Block
  const [venueName, setVenueName] = useState(cafe?.name || '')
  const [venuePhone, setVenuePhone] = useState(cafe?.phone || '')

  const handleSaveVenue = async () => {
    if (!cafe) return
    setIsSaving(true)
    try {
      const { data, error } = await supabase
        .from('cafes')
        .update({ name: venueName, phone: venuePhone })
        .eq('id', cafe.id)
        .select()
        .single()

      if (error) throw error
      if (data) setCafe(data)
      addToast("Identité mise à jour", "success")
      logAction('settings_updated', { section: 'venue_identity', name: venueName })
    } catch (err: any) {
      addToast(err.message, "error")
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = async () => {
    try {
      if (type === 'owner') await supabase.auth.signOut()
      logout()
      navigate('/login')
    } catch (e) {}
  }

  const sections = [
    type === 'owner' && {
      id: 'venue',
      icon: Store,
      title: "Paramètres de l'établissement",
      content: (
        <div className="space-y-4 pt-2">
          <Input
            label="Nom du café"
            value={venueName}
            onChange={e => setVenueName(e.target.value)}
          />
          <Input
            label="Téléphone"
            value={venuePhone}
            onChange={e => setVenuePhone(e.target.value)}
            type="tel"
          />
          <Button
            className="w-full h-12"
            onClick={handleSaveVenue}
            isLoading={isSaving}
          >
            <Save size={18} />
            Enregistrer les modifications
          </Button>
        </div>
      )
    },
    {
      id: 'staff',
      icon: Users,
      title: "Gestion d'équipe",
      onClick: () => navigate('/settings/staff')
    },
    {
       id: 'audit',
       icon: List,
       title: "Journal d'audit",
       onClick: () => navigate('/settings/audit')
    },
    {
       id: 'products',
       icon: ShoppingBag,
       title: "Catalogue Produits",
       onClick: () => navigate('/settings/products')
    }
  ].filter(Boolean)

  return (
    <div className="min-h-screen bg-bg pb-24">
      {/* Header with Back Button (Task 7A) */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-bg/90 backdrop-blur-xl border-b border-border z-[100] flex items-center px-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text2 hover:text-text transition-colors" aria-label="Retour">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-sm font-bold text-text ml-2">{t('settings.title')}</h1>
      </header>

      <main className="pt-20 px-4 space-y-4 max-w-lg mx-auto">
        {/* Venue Identity Block (Task 7B) */}
        <section className="bg-surface border border-border rounded-2xl p-6 mb-8">
           <div className="flex flex-col items-center text-center mb-6">
              <div className="w-20 h-20 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center text-accent mb-4">
                 <img src="/favicon.svg" className="w-12 h-12 drop-shadow-lg" alt="Nook OS" />
              </div>
              <h2 className="text-2xl font-black text-text tracking-tighter mb-1">{cafe?.name}</h2>
              <p className="text-xs font-bold text-text3 uppercase tracking-widest">Établissement vérifié</p>
           </div>

           <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-bg border border-border rounded-xl">
                 <Store size={16} className="text-text3" />
                 <div className="flex-1">
                    <div className="text-[10px] font-bold text-text3 uppercase tracking-widest leading-none mb-1">Café</div>
                    <div className="text-sm font-bold text-text leading-none">{cafe?.name}</div>
                 </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-bg border border-border rounded-xl">
                 <UserCircle size={16} className="text-text3" />
                 <div className="flex-1">
                    <div className="text-[10px] font-bold text-text3 uppercase tracking-widest leading-none mb-1">Gérant</div>
                    <div className="text-sm font-bold text-text leading-none">{owner?.user_metadata?.full_name || 'Propriétaire'}</div>
                 </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-bg border border-border rounded-xl">
                 <Phone size={16} className="text-text3" />
                 <div className="flex-1">
                    <div className="text-[10px] font-bold text-text3 uppercase tracking-widest leading-none mb-1">WhatsApp</div>
                    <div className="text-sm font-bold text-text leading-none">{cafe?.phone || 'Non renseigné'}</div>
                 </div>
              </div>
           </div>
        </section>

        {/* Settings Sections */}
        <div className="space-y-2">
          {sections.map((section: any) => (
            <div key={section.id} className="bg-surface border border-border rounded-2xl overflow-hidden">
              <button
                onClick={() => section.onClick ? section.onClick() : setExpanded(expanded === section.id ? null : section.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <section.icon size={18} className="text-text3" />
                  <span className="text-sm font-semibold text-text">{section.title}</span>
                </div>
                {section.onClick ? (
                  <ChevronRight size={18} className="text-text3" />
                ) : (
                  <ChevronDown size={18} className={`text-text3 transition-transform ${expanded === section.id ? 'rotate-180' : ''}`} />
                )}
              </button>
              <AnimatePresence>
                {expanded === section.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-4 overflow-hidden"
                  >
                    {section.content}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <Button
          variant="ghost"
          className="w-full h-14 mt-8 border-error/20 text-error hover:bg-error/5"
          onClick={() => setShowLogout(true)}
        >
          <LogOut size={18} />
          {t('settings.logout')}
        </Button>
      </main>

      <ConfirmDialog
        isOpen={showLogout}
        onClose={() => setShowLogout(false)}
        onConfirm={handleLogout}
        title={t('settings.logout')}
        message={t('auth.logout_confirm')}
        confirmLabel={t('settings.logout')}
        variant="danger"
      />

      <BottomNav />
    </div>
  )
}
