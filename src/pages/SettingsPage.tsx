import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { 
  Store,
  DollarSign,
  Bell,
  ShoppingBag,
  Users,
  Key,
  Globe,
  User,
  LogOut,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Trash2,
  Plus,
  KeyRound,
  RefreshCw
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'
import { useTranslation } from '../hooks/useTranslation'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { BottomNav } from '../components/layout/BottomNav'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { BottomSheet } from '../components/ui/BottomSheet'

export default function SettingsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { cafe, owner, logout, setCafe } = useAuthStore()
  const { language, setLanguage, addToast } = useUIStore()

  const [expanded, setExpanded] = useState<string | null>(null)
  const [showLogout, setShowLogout] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Form states
  const [cafeName, setCafeName] = useState(cafe?.name || '')
  const [city, setCity] = useState(cafe?.city || '')
  const [address, setAddress] = useState(cafe?.address || '')
  const [phone, setPhone] = useState(cafe?.phone || '')

  // Rates
  const [standardRate, setStandardRate] = useState(cafe?.default_rate || 2)
  const [premiumRate, setPremiumRate] = useState(cafe?.premium_rate || 3)
  const [billingInc, setBillingInc] = useState(cafe?.billing_increment || 'minute')

  // Alerts
  const [longSessionAlert, setLongSessionAlert] = useState(cafe?.long_session_alert_hours || 3)
  const [lowBalanceAlert, setLowBalanceAlert] = useState(cafe?.low_balance_alert || 20)

  // Products
  const [products, setProducts] = useState<any[]>([])
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [newProductName, setNewProductName] = useState('')
  const [newProductPrice, setNewProductPrice] = useState('')
  const [newProductCat, setNewProductCat] = useState('boisson')

  useEffect(() => {
    if (expanded === 'products') {
      loadProducts()
    }
  }, [expanded])

  const loadProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('cafe_id', cafe?.id).order('sort_order')
    if (data) setProducts(data)
  }

  const handleUpdateCafe = async (updates: any) => {
    if (!cafe) return
    setIsSaving(true)
    try {
      const { data, error } = await supabase.from('cafes').update(updates).eq('id', cafe.id).select().single()
      if (error) throw error
      setCafe(data)
      addToast(t('common.success'), 'success')
    } catch (err: any) {
      addToast(err.message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddProduct = async () => {
    if (!newProductName || !newProductPrice) return
    try {
      const { error } = await supabase.from('products').insert({
        cafe_id: cafe?.id,
        name: newProductName,
        price: parseFloat(newProductPrice),
        category: newProductCat,
        active: true,
        sort_order: products.length
      })
      if (error) throw error
      addToast(t('settings.product_added'), 'success')
      setShowAddProduct(false)
      setNewProductName('')
      setNewProductPrice('')
      loadProducts()
    } catch (err: any) {
      addToast(err.message, 'error')
    }
  }

  const handleDeleteProduct = async (id: string) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
      addToast(t('settings.product_deleted'), 'success')
      loadProducts()
    } catch (err: any) {
      addToast(err.message, 'error')
    }
  }

  const handleLanguageToggle = async (lang: 'fr' | 'en') => {
    setLanguage(lang)
    if (cafe) {
      await supabase.from('cafes').update({ language: lang }).eq('id', cafe.id)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    logout()
    navigate('/login')
  }

  const AccordionHeader = ({ id, icon: Icon, label, preview }: any) => (
    <button
      onClick={() => setExpanded(expanded === id ? null : id)}
      className="w-full h-14 flex items-center justify-between px-4 bg-surface border-b border-border active:bg-white/5 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon size={20} className={expanded === id ? 'text-accent2' : 'text-text3'} />
        <span className={`text-[15px] font-semibold ${expanded === id ? 'text-accent2' : 'text-text'}`}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {preview && <span className="text-[12px] text-text3">{preview}</span>}
        <ChevronDown size={16} className={`text-text3 transition-transform ${expanded === id ? 'rotate-180' : ''}`} />
      </div>
    </button>
  )

  return (
    <div className="min-h-screen bg-bg relative pb-24">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <header className="fixed top-0 left-0 right-0 h-14 bg-bg/92 backdrop-blur-md border-b border-border z-[100] flex items-center justify-center">
        <h1 className="text-base font-bold text-text">{t('settings.title')}</h1>
      </header>

      <main className="pt-14 relative z-10">
        <div className="divide-y divide-border">
          {/* MON CAFE */}
          <div>
            <AccordionHeader id="cafe" icon={Store} label={t('settings.my_cafe')} />
            <AnimatePresence>
              {expanded === 'cafe' && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-bg2">
                  <div className="p-4 space-y-4">
                    <Input placeholder="Nom du café" value={cafeName} onChange={e => setCafeName(e.target.value)} icon={<Store size={16}/>}/>
                    <Input placeholder="Ville" value={city} onChange={e => setCity(e.target.value)} icon={<Globe size={16}/>}/>
                    <Input placeholder="Adresse" value={address} onChange={e => setAddress(e.target.value)} icon={<User size={16}/>}/>
                    <Input placeholder="Téléphone" value={phone} onChange={e => setPhone(e.target.value)} icon={<User size={16}/>}/>
                    <Button className="w-full h-10 text-sm" isLoading={isSaving} onClick={() => handleUpdateCafe({ name: cafeName, city, address, phone })}>Enregistrer</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* TARIFS */}
          <div>
            <AccordionHeader id="rates" icon={DollarSign} label={t('settings.rates')} />
            <AnimatePresence>
              {expanded === 'rates' && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-bg2">
                  <div className="p-4 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-text3 uppercase">Standard (DH/h)</label>
                        <Input type="number" step="0.5" value={standardRate} onChange={e => setStandardRate(parseFloat(e.target.value))} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-text3 uppercase">Premium (DH/h)</label>
                        <Input type="number" step="0.5" value={premiumRate} onChange={e => setPremiumRate(parseFloat(e.target.value))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-text3 uppercase">Incrément</label>
                      <select className="input" value={billingInc} onChange={e => setBillingInc(e.target.value)}>
                        <option value="minute">À la minute</option>
                        <option value="15min">Par 15 minutes</option>
                        <option value="30min">Par 30 minutes</option>
                        <option value="hour">À l'heure</option>
                      </select>
                    </div>
                    <Button className="w-full h-10 text-sm" isLoading={isSaving} onClick={() => handleUpdateCafe({ default_rate: standardRate, premium_rate: premiumRate, billing_increment: billingInc })}>Mettre à jour les tarifs</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ALERTES */}
          <div>
            <AccordionHeader id="alerts" icon={Bell} label={t('settings.alerts')} />
            <AnimatePresence>
              {expanded === 'alerts' && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-bg2">
                  <div className="p-4 space-y-5">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-text2">{t('settings.long_session')}</span>
                      <Input type="number" className="w-24 text-right" value={longSessionAlert} onChange={e => setLongSessionAlert(parseInt(e.target.value))} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-text2">{t('settings.low_balance')}</span>
                      <Input type="number" className="w-24 text-right" value={lowBalanceAlert} onChange={e => setLowBalanceAlert(parseInt(e.target.value))} />
                    </div>
                    <Button className="w-full h-10 text-sm" isLoading={isSaving} onClick={() => handleUpdateCafe({ long_session_alert_hours: longSessionAlert, low_balance_alert: lowBalanceAlert })}>Enregistrer</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* PRODUITS */}
          <div>
            <AccordionHeader id="products" icon={ShoppingBag} label={t('settings.products')} />
            <AnimatePresence>
              {expanded === 'products' && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-bg2">
                  <div className="p-4 space-y-4">
                    <div className="space-y-2">
                      {products.map(p => (
                        <div key={p.id} className="flex items-center justify-between bg-surface border border-border p-3 rounded-lg">
                          <div>
                            <div className="text-sm font-semibold">{p.name}</div>
                            <div className="text-xs text-accent2 font-mono">{p.price.toFixed(2)} DH · {p.category}</div>
                          </div>
                          <button onClick={() => handleDeleteProduct(p.id)} className="text-text3 hover:text-error p-2">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <Button variant="ghost" className="w-full h-10 border-dashed text-xs" onClick={() => setShowAddProduct(true)}>
                      <Plus size={14} /> {t('settings.add_product')}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* MON EQUIPE */}
          <button
            onClick={() => navigate('/settings/staff')}
            className="w-full h-14 flex items-center justify-between px-4 bg-surface border-b border-border active:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Users size={20} className="text-text3" />
              <span className="text-[15px] font-semibold text-text">{t('settings.team')}</span>
            </div>
            <ChevronRight size={18} className="text-text3" />
          </button>

          {/* INVITE CODE */}
          <div>
            <AccordionHeader id="invite" icon={Key} label={t('settings.invite_code')} />
            <AnimatePresence>
              {expanded === 'invite' && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-bg2">
                  <div className="p-6 space-y-5 flex flex-col items-center">
                    <div className="text-[26px] font-mono font-bold text-accent2 tracking-[0.2em]">{cafe?.invite_code}</div>
                    <div className="flex gap-2">
                      <Button variant="ghost" className="h-9 px-4 text-xs gap-2" onClick={() => { navigator.clipboard.writeText(cafe?.invite_code || ''); addToast("Copié", "success") }}>
                        <Copy size={14} /> {t('settings.copy_code')}
                      </Button>
                      <Button variant="ghost" className="h-9 px-4 text-xs gap-2 border-error/20 text-error">
                        <RefreshCw size={14} /> {t('settings.regenerate_warning') ? 'Régénérer' : 'Régénérer'}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* LANGUE */}
          <div>
            <AccordionHeader id="lang" icon={Globe} label={t('settings.language')} preview={language === 'fr' ? 'Français' : 'English'} />
            <AnimatePresence>
              {expanded === 'lang' && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-bg2">
                  <div className="p-4 grid grid-cols-2 gap-2">
                    {[
                      { id: 'fr', label: 'Français', badge: 'FR' },
                      { id: 'en', label: 'English', badge: 'EN' }
                    ].map(l => (
                      <button
                        key={l.id}
                        onClick={() => handleLanguageToggle(l.id as any)}
                        className={`h-12 flex items-center justify-between px-4 rounded-xl border transition-all ${
                          language === l.id ? 'bg-accent-glow border-accent-border text-accent2' : 'bg-surface border-border text-text3'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded bg-surface2 flex items-center justify-center text-[10px] font-bold border border-border">{l.badge}</div>
                          <span className="text-[13px] font-bold">{l.label}</span>
                        </div>
                        {language === l.id && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* COMPTE */}
          <div>
            <AccordionHeader id="account" icon={User} label={t('settings.account')} />
            <AnimatePresence>
              {expanded === 'account' && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-bg2">
                  <div className="p-4 space-y-4">
                    <div className="text-[13px] text-text2 px-1">{owner?.email}</div>
                    <Button variant="ghost" className="w-full h-10 text-xs gap-2" onClick={() => {}}>
                      <KeyRound size={14} /> Changer le mot de passe
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <button
          onClick={() => setShowLogout(true)}
          className="w-full h-14 flex items-center gap-3 px-4 text-error mt-8 border-y border-border active:bg-error/5 transition-colors"
        >
          <LogOut size={20} />
          <span className="text-[15px] font-bold">{t('auth.logout')}</span>
        </button>
      </main>

      <BottomSheet isOpen={showAddProduct} onClose={() => setShowAddProduct(false)} title={t('settings.add_product')}>
        <div className="space-y-6 pt-4">
          <Input placeholder={t('settings.product_name')} value={newProductName} onChange={e => setNewProductName(e.target.value)} />
          <div className="relative">
            <Input type="number" placeholder={t('settings.product_price')} value={newProductPrice} onChange={e => setNewProductPrice(e.target.value)} />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text3 font-mono text-sm">DH</span>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-text3 uppercase">{t('settings.product_category')}</label>
            <div className="grid grid-cols-3 gap-2">
              {['boisson', 'nourriture', 'autre'].map(c => (
                <button
                  key={c}
                  onClick={() => setNewProductCat(c)}
                  className={`h-10 rounded-lg border text-xs font-bold transition-all ${
                    newProductCat === c ? 'bg-accent text-white border-accent' : 'bg-surface2 border-border text-text3'
                  }`}
                >
                  {t(`cat.${c}`)}
                </button>
              ))}
            </div>
          </div>
          <Button className="w-full h-12" onClick={handleAddProduct}>{t('common.save')}</Button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        isOpen={showLogout}
        onClose={() => setShowLogout(false)}
        onConfirm={handleLogout}
        title={t('auth.logout')}
        message={t('auth.logout_confirm')}
        variant="danger"
      />

      <BottomNav />
    </div>
  )
}
