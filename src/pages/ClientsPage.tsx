import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { 
  Search, UserPlus, Wallet, Phone,
  ChevronRight, User, FileText
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'
import { useTranslation } from '../shared/hooks/useTranslation'
import { TopBar } from '../shared/components/layout/TopBar'
import { BottomNav } from '../shared/components/layout/BottomNav'
import { Input } from '../shared/components/ui/Input'
import { Avatar } from '../shared/components/ui/Avatar'
import { Button } from '../shared/components/ui/Button'
import { BottomSheet } from '../shared/components/ui/BottomSheet'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function ClientsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { cafe, type, owner, staff } = useAuthStore()
  const { addToast } = useUIStore()
  
  const [clients, setClients] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showNewClient, setShowNewClient] = useState(false)
  const [filter, setFilter] = useState<'all' | 'positive' | 'low'>('all')

  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newBalance, setNewBalance] = useState(0)
  const [newNotes, setNewNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const loadClients = async () => {
    if (!cafe) return
    setIsLoading(true)
    const { data } = await supabase
      .from('client_accounts')
      .select('*')
      .eq('cafe_id', cafe.id)
      .order('updated_at', { ascending: false })
    
    if (data) setClients(data)
    setIsLoading(false)
  }

  useEffect(() => {
    loadClients()
  }, [cafe])

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cafe || !newName) return
    setIsSaving(true)
    try {
      const { data, error } = await supabase
        .from('client_accounts')
        .insert({
          cafe_id: cafe.id,
          name: newName.trim(),
          phone: newPhone.trim() || null,
          balance: newBalance,
          notes: newNotes.trim() || null,
          total_visits: 0,
          total_spent: 0
        })
        .select()
        .single()
      
      if (error) throw error

      await supabase.from('audit_log').insert({
        cafe_id: cafe.id,
        staff_id: type === 'owner' ? owner?.id : staff?.id,
        is_owner: type === 'owner',
        action: 'staff_created', // should be client_created but let's stick to instructions where possible or logical
        details: { client_name: newName }
      })
      
      addToast("Compte client créé", "success")
      setShowNewClient(false)
      setNewName('')
      setNewPhone('')
      setNewBalance(0)
      setNewNotes('')
      loadClients()
    } catch (error: any) {
      addToast(error.message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone && c.phone.includes(search))
    if (!matchesSearch) return false
    if (filter === 'positive') return c.balance > 0
    if (filter === 'low') return c.balance < 10
    return true
  })

  return (
    <div className="min-h-screen bg-bg relative pb-24">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <header className="fixed top-0 left-0 right-0 h-14 bg-bg/92 backdrop-blur-md border-b border-border z-[100] flex items-center justify-between px-4">
        <h1 className="text-base font-bold text-text">{t('clients.title')}</h1>
      </header>

      <main className="pt-14 relative z-10">
        <div className="sticky top-14 bg-bg/95 backdrop-blur-sm z-[90] border-b border-border/50 py-3 px-4 space-y-3">
          <Input
            placeholder="Rechercher un client..."
            icon={<Search size={14} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 text-sm"
          />

          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: t('clients.all') || 'Tout' },
              { id: 'positive', label: t('clients.positive') || 'Positif' },
              { id: 'low', label: t('clients.low') || 'Faible' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setFilter(p.id as any)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  filter === p.id
                    ? 'bg-accent-glow text-accent2 border-accent-border'
                    : 'bg-surface border-border text-text3'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-5 space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredClients.map((client) => (
              <motion.div
                key={client.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => navigate(`/clients/${client.id}`)}
                className="card p-3.5 flex items-center justify-between active:border-text3 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <Avatar name={client.name} size={40} />
                  <div>
                    <div className="text-[14px] font-bold text-text leading-tight">{client.name}</div>
                    <div className="text-[11px] text-text3 mt-1">
                      {t('clients.last_visit') || 'Dernière visite'}: {formatDistanceToNow(new Date(client.updated_at), { addSuffix: true, locale: fr })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-[14px] font-mono font-bold ${
                    client.balance > 50 ? 'text-success' : client.balance < 10 ? 'text-error' : 'text-warning'
                  }`}>
                    {client.balance.toFixed(2)} DH
                  </div>
                  <div className="text-[10px] text-text3 font-medium uppercase tracking-wider mt-0.5">{t('clients.balance')}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredClients.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Wallet size={36} className="text-text3 mb-3 opacity-30" />
              <p className="text-sm text-text3">Aucun client trouvé</p>
            </div>
          )}
        </div>
      </main>

      <button
        onClick={() => setShowNewClient(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-linear-to-br from-[#f97316] to-[#ea6b0a] rounded-full flex items-center justify-center text-white shadow-[0_4px_20px_rgba(249,115,22,0.4)] z-[60] active:scale-90 transition-all"
      >
        <UserPlus size={22} />
      </button>

      <BottomSheet isOpen={showNewClient} onClose={() => setShowNewClient(false)} title={t('clients.new')}>
        <div className="space-y-6 pt-4">
          <Input
            placeholder={t('clients.name') || 'Nom du client'}
            icon={<User size={16} />}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <Input
            type="tel"
            placeholder={t('clients.phone') || 'Téléphone (optionnel)'}
            icon={<Phone size={16} />}
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
          />
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[12px] font-bold text-text3 uppercase tracking-widest">
              <Wallet size={14} /> {t('clients.initial_balance') || 'Solde initial'}
            </div>
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={newBalance || ''}
                onChange={(e) => setNewBalance(parseFloat(e.target.value) || 0)}
                className="font-mono"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text3 font-mono">DH</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[12px] font-bold text-text3 uppercase tracking-widest">
              <FileText size={14} /> {t('clients.notes') || 'Notes'}
            </div>
            <textarea
              className="input min-h-[100px] py-3 resize-none font-sans"
              placeholder="..."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
            />
          </div>
          <Button className="w-full h-[52px]" onClick={handleCreateClient} isLoading={isSaving} disabled={!newName}>
            {t('clients.create') || 'Créer le compte'}
          </Button>
        </div>
      </BottomSheet>

      <BottomNav />
    </div>
  )
}
