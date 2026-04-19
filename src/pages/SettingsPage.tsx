import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { 
  ChevronLeft,
  ChevronRight,
  Users,
  Coffee,
  Layout,
  Bell,
  Globe,
  ShieldCheck,
  LogOut,
  Save,
  Building2,
  Phone,
  User,
  Image as ImageIcon
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'
import { useTranslation } from '../shared/hooks/useTranslation'
import { Button } from '../shared/components/ui/Button'
import { Input } from '../shared/components/ui/Input'
import { BottomNav } from '../shared/components/layout/BottomNav'

export default function SettingsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { cafe, logout, setCafe } = useAuthStore()
  const { addToast } = useUIStore()

  const [name, setName] = useState(cafe?.name || '')
  const [ownerName, setOwnerName] = useState('')
  const [phone, setPhone] = useState(cafe?.phone || '')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (cafe) {
        setName(cafe.name)
        setPhone(cafe.phone || '')
    }
  }, [cafe])

  const handleSaveVenue = async () => {
    if (!cafe) return
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('cafes')
        .update({ name, phone })
        .eq('id', cafe.id)

      if (error) throw error
      setCafe({ ...cafe, name, phone })
      addToast("Modifications enregistrées", "success")
    } catch (err: any) {
      addToast(err.message, "error")
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-bg pb-24">
      <header className="fixed top-0 left-0 right-0 h-14 bg-bg/92 backdrop-blur-md border-b border-border z-[100] flex items-center px-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text2 hover:text-text" aria-label="Retour">
          <ChevronLeft size={22} />
        </button>
        <span className="text-base font-bold text-text">Paramètres</span>
      </header>

      <main className="pt-20 px-4 space-y-6">
        {/* Venue Identity Block */}
        <section className="bg-surface2 border border-border rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-4 mb-2">
                <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-accent/20">N</div>
                <div className="flex-1">
                    <h2 className="text-lg font-bold text-text">Identité du Café</h2>
                    <p className="text-xs text-text3">Ces informations apparaissent sur vos reçus.</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-text3 uppercase tracking-wider ml-1">Nom du Café</label>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        icon={<Building2 size={16}/>}
                        placeholder="Ex: Nook Coffee & Work"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-text3 uppercase tracking-wider ml-1">Propriétaire</label>
                    <Input
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        icon={<User size={16}/>}
                        placeholder="Votre nom"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-text3 uppercase tracking-wider ml-1">Téléphone du Café</label>
                    <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        icon={<Phone size={16}/>}
                        placeholder="Ex: 212XXXXXXXXX"
                    />
                </div>
                <Button className="w-full h-11" onClick={handleSaveVenue} isLoading={isSaving}>
                    <Save size={18} className="mr-2"/> Enregistrer les modifications
                </Button>
            </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-[11px] font-bold text-text3 uppercase tracking-widest ml-1">Management</h3>
          <div className="card divide-y divide-border overflow-hidden">
            <Link to="/settings/staff" className="flex items-center justify-between p-4 active:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
                  <Users size={18} />
                </div>
                <div>
                  <div className="text-sm font-bold">Gestion du personnel</div>
                  <div className="text-[11px] text-text3">Comptes, PINs et permissions</div>
                </div>
              </div>
              <ChevronRight size={18} className="text-text3" />
            </Link>

            <Link to="/products" className="flex items-center justify-between p-4 active:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500">
                  <Coffee size={18} />
                </div>
                <div>
                  <div className="text-sm font-bold">Produits & Menu</div>
                  <div className="text-[11px] text-text3">Gérer votre catalogue et prix</div>
                </div>
              </div>
              <ChevronRight size={18} className="text-text3" />
            </Link>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-[11px] font-bold text-text3 uppercase tracking-widest ml-1">Configuration</h3>
          <div className="card divide-y divide-border overflow-hidden">
            <button className="w-full flex items-center justify-between p-4 active:bg-white/5 transition-colors text-left">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500">
                  <Layout size={18} />
                </div>
                <div>
                  <div className="text-sm font-bold">Interface & Affichage</div>
                  <div className="text-[11px] text-text3">Mode sombre, thèmes et mise en page</div>
                </div>
              </div>
              <ChevronRight size={18} className="text-text3" />
            </button>

            <button className="w-full flex items-center justify-between p-4 active:bg-white/5 transition-colors text-left">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-500">
                  <Globe size={18} />
                </div>
                <div>
                  <div className="text-sm font-bold">Langue & Région</div>
                  <div className="text-[11px] text-text3">Français (MA)</div>
                </div>
              </div>
              <ChevronRight size={18} className="text-text3" />
            </button>
          </div>
        </section>

        <section className="pt-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-border text-error font-bold active:bg-error/5 transition-all"
          >
            <LogOut size={18} />
            Se déconnecter
          </button>
          <div className="text-center mt-6 text-[10px] text-text3 font-medium tracking-widest uppercase">
            Nook OS • Version 2.0.0
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
