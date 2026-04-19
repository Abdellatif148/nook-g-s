import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { 
  Store, DollarSign, ShoppingBag, Users, 
  Key, Globe, LogOut, ChevronDown, 
  ChevronRight, Copy, Check, BarChart2,
  Building2, User, Phone, Pencil, Save
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'
import { useTranslation, useLanguageStore } from '../i18n'
import { useAudit } from '../hooks/useAudit'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { BottomNav } from '../components/layout/BottomNav'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'

export default function SettingsPage() {
  const { t, language } = useTranslation()
  const { setLanguage } = useLanguageStore()
  const navigate = useNavigate()
  const { cafe, owner, type, staff, logout, setCafe } = useAuthStore()
  const addToast = useUIStore((state) => state.addToast)
  const { logAction } = useAudit()

  const [expanded, setExpanded] = useState<string | null>(null)
  const [showLogout, setShowLogout] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Venue identity
  const [cafeName, setCafeName] = useState(cafe?.name || '')
  const [phone, setPhone] = useState(cafe?.phone || '')
  const [ownerName, setOwnerName] = useState(owner?.user_metadata?.full_name || '')
  const [identityEditing, setIdentityEditing] = useState(false)
  const [isSavingIdentity, setIsSavingIdentity] = useState(false)

  const [defaultRate, setDefaultRate] = useState<string>(cafe?.default_rate?.toString() || '')
  const [premiumRate, setPremiumRate] = useState<string>(cafe?.premium_rate?.toString() || '')
  const [isSavingRates, setIsSavingRates] = useState(false)

  const isOwner = type === 'owner'
  const canEditRates = isOwner || (staff?.permissions as any)?.rates
  const hasPermission = (perm: 'reports' | 'clients' | 'settings') => {
    if (isOwner) return true
    if (!staff?.permissions) return false
    return !!(staff.permissions as any)[perm]
  }

  const handleSaveIdentity = async () => {
    if (!cafe) return
    setIsSavingIdentity(true)
    try {
      const [cafeRes, userRes] = await Promise.all([
        supabase.from('cafes' as any)
          .update({ name: cafeName, phone })
          .eq('id', cafe.id)
          .select()
          .single(),
        supabase.auth.updateUser({ data: { full_name: ownerName } }),
      ])
      if (cafeRes.error) throw cafeRes.error
      if (userRes.error) throw userRes.error
      setCafe(cafeRes.data)
      await logAction('cafe_updated', { name: cafeName, phone, owner_name: ownerName })
      addToast("Informations mises à jour", "success")
      setIdentityEditing(false)
    } catch (err: any) {
      addToast(err.message, 'error')
    } finally {
      setIsSavingIdentity(false)
    }
  }

  const handleSaveCafe = async () => {
    if (!cafe) return
    setIsSaving(true)
    try {
      const { data, error } = await supabase
        .from('cafes' as any)
        .update({ name: cafeName, phone })
        .eq('id', cafe.id)
        .select()
        .single()
      
      if (error) throw error
      
      await logAction('cafe_updated', {
        name: cafeName,
        phone
      })

      setCafe(data)
      addToast("Informations mises à jour", "success")
    } catch (error: any) {
      addToast(error.message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveRates = async () => {
    if (!cafe) return
    setIsSavingRates(true)
    try {
      const defRate = parseFloat(defaultRate)
      const premRate = parseFloat(premiumRate)
      if (isNaN(defRate) || isNaN(premRate)) {
        throw new Error("Tarifs invalides")
      }

      const { data, error } = await supabase
        .from('cafes' as any)
        .update({ default_rate: defRate, premium_rate: premRate })
        .eq('id', cafe.id)
        .select()
        .single()
      
      if (error) throw error
      
      await logAction('cafe_updated', {
        default_rate: defRate,
        premium_rate: premRate
      })

      setCafe(data)
      addToast("Tarifs mis à jour", "success")
    } catch (error: any) {
      addToast(error.message, 'error')
    } finally {
      setIsSavingRates(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    logout()
    navigate('/login')
  }

  const sections = [
    { id: 'cafe', icon: Store, title: t('settings.my_cafe'), content: (
      <div className="space-y-4 pt-2">
        <Input label="Nom du café" value={cafeName} onChange={(e) => setCafeName(e.target.value)} />
        <Input label="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Button onClick={handleSaveCafe} isLoading={isSaving} className="w-full">Enregistrer</Button>
      </div>
    )},
    canEditRates && { id: 'rates', icon: DollarSign, title: t('settings.rates'), content: (
      <div className="space-y-4 pt-2">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Standard (DH/h)" type="number" step="0.5" value={defaultRate} onChange={(e) => setDefaultRate(e.target.value)} />
          <Input label="Premium (DH/h)" type="number" step="0.5" value={premiumRate} onChange={(e) => setPremiumRate(e.target.value)} />
        </div>
        <Button onClick={handleSaveRates} isLoading={isSavingRates} className="w-full">Enregistrer les tarifs</Button>
      </div>
    )},
    hasPermission('reports') && { id: 'reports', icon: BarChart2, title: t('dashboard.reports'), onClick: () => navigate('/reports') },
    { id: 'products', icon: ShoppingBag, title: t('settings.product_catalog'), onClick: () => navigate('/settings/products') },
    isOwner && { id: 'staff', icon: Users, title: t('settings.team'), onClick: () => navigate('/settings/staff') },
    isOwner && { id: 'invite', icon: Key, title: t('settings.invite_code'), content: (
      <div className="space-y-4 pt-4">
        <div className="bg-black/25 border border-border rounded-xl p-4 flex items-center justify-center gap-4">
          <span className="text-2xl font-mono font-bold text-text tracking-[0.2em]">{cafe?.invite_code}</span>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(cafe?.invite_code || '')
              addToast("Code copié", "success")
            }}
            className="p-2 text-text3 hover:text-accent"
          >
            <Copy size={18} />
          </button>
        </div>
      </div>
    )},
    { id: 'lang', icon: Globe, title: t('settings.language'), content: (
      <div className="space-y-2 pt-2">
        <button 
          onClick={() => setLanguage('fr')}
          className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${
            language === 'fr' ? 'bg-accent-glow border-accent text-accent2' : 'bg-surface2 border-border text-text'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-[10px] font-bold text-text3">
              FR
            </div>
            <span className="text-sm font-semibold">Français</span>
          </div>
          {language === 'fr' && <Check size={16} className="text-accent" />}
        </button>
        <button 
          onClick={() => setLanguage('en')}
          className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${
            language === 'en' ? 'bg-accent-glow border-accent text-accent2' : 'bg-surface2 border-border text-text'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-[10px] font-bold text-text3">
              EN
            </div>
            <span className="text-sm font-semibold">English</span>
          </div>
          {language === 'en' && <Check size={16} className="text-accent" />}
        </button>
      </div>
    )},
  ]

  return (
    <div className="min-h-screen bg-bg pb-24">
      <header className="fixed top-0 left-0 right-0 h-14 bg-bg/90 backdrop-blur-xl border-b border-border z-[100] flex items-center justify-center px-4">
        <h1 className="text-sm font-bold text-text">{t('settings.title')}</h1>
      </header>

      <main className="pt-20 px-4 space-y-4">
        {/* Venue Identity Block */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden mb-6">
          {/* Logo + Venue Name header */}
          <div className="p-4 flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shrink-0">
                <span className="text-white font-extrabold text-sm tracking-tight">N</span>
              </div>
              <div>
                <div className="text-[10px] font-bold text-text3 uppercase tracking-widest">Nook OS</div>
                <div className="text-sm font-extrabold text-text leading-tight">{cafeName || 'Mon café'}</div>
              </div>
            </div>
            {isOwner && (
              <button
                onClick={() => setIdentityEditing(!identityEditing)}
                className={`p-2 rounded-lg transition-colors ${identityEditing ? 'bg-accent text-white' : 'text-text3 hover:text-text hover:bg-surface2'}`}
              >
                <Pencil size={16} />
              </button>
            )}
          </div>

          {/* Identity fields — read-only or editable */}
          <AnimatePresence>
            {identityEditing ? (
              <motion.div
                key="editing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 space-y-3"
              >
                <Input
                  label="Nom du café"
                  icon={<Building2 size={16} />}
                  value={cafeName}
                  onChange={(e) => setCafeName(e.target.value)}
                />
                <Input
                  label="Propriétaire"
                  icon={<User size={16} />}
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                />
                <Input
                  label="Téléphone"
                  icon={<Phone size={16} />}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                />
                <Button
                  onClick={handleSaveIdentity}
                  isLoading={isSavingIdentity}
                  className="w-full"
                >
                  <Save size={16} />
                  Enregistrer
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="readonly"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="divide-y divide-border"
              >
                <div className="px-4 py-3 flex items-center gap-3">
                  <User size={14} className="text-text3 shrink-0" />
                  <div>
                    <div className="text-[10px] text-text3">Propriétaire</div>
                    <div className="text-sm font-semibold text-text">{ownerName || owner?.email}</div>
                  </div>
                </div>
                <div className="px-4 py-3 flex items-center gap-3">
                  <Phone size={14} className="text-text3 shrink-0" />
                  <div>
                    <div className="text-[10px] text-text3">Téléphone</div>
                    <div className="text-sm font-semibold text-text">{phone || '—'}</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Settings Sections */}
        <div className="space-y-2">
          {sections.filter(Boolean).map((section: any) => (
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
