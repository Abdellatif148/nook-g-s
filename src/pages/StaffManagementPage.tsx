import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { 
  ChevronLeft,
  Plus,
  Search,
  Power,
  Trash2,
  Timer,
  BarChart2,
  Users,
  Settings,
  User,
  Check,
  ChevronRight,
  KeyRound
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'
import { useTranslation } from '../hooks/useTranslation'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { BottomSheet } from '../components/ui/BottomSheet'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Avatar } from '../components/ui/Avatar'
import { PINDots } from '../components/ui/PINDots'
import { NumPad } from '../components/ui/NumPad'
import { hashPin } from '../lib/crypto'

export default function StaffManagementPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { cafe, owner } = useAuthStore()
  const { addToast } = useUIStore()

  const [staffList, setStaffList] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [showAdd, setShowAdd] = useState(false)
  const [editingStaff, setEditingStaff] = useState<any>(null)

  // Form states
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [isConfirmingPin, setIsConfirmingPin] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [permissions, setPermissions] = useState({
    sessions: true,
    reports: false,
    clients: false,
    settings: false
  })
  const [isSaving, setIsSaving] = useState(false)

  const [staffToDelete, setStaffToDelete] = useState<any>(null)

  const loadStaff = async () => {
    if (!cafe) return
    setIsLoading(true)
    const { data } = await supabase.from('staff').select('*').eq('cafe_id', cafe.id).order('active', { ascending: false })
    if (data) setStaffList(data)
    setIsLoading(false)
  }

  useEffect(() => {
    loadStaff()
  }, [cafe])

  const handleAddStaff = async () => {
    if (!name || pin.length < 4 || pin !== confirmPin) return
    setIsSaving(true)
    try {
      const pinHash = await hashPin(pin)
      const { error } = await supabase.from('staff').insert({
        cafe_id: cafe?.id,
        name: name.trim(),
        pin_hash: pinHash,
        active: true,
        permissions
      })
      if (error) throw error
      
      await supabase.from('audit_log').insert({
        cafe_id: cafe?.id,
        staff_id: owner?.id,
        is_owner: true,
        action: 'staff_created',
        details: { staff_name: name }
      })

      addToast(t('staff.staff_added'), 'success')
      closeSheet()
      loadStaff()
    } catch (err: any) {
      addToast(err.message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateStaff = async () => {
    if (!name || !editingStaff) return
    setIsSaving(true)
    try {
      const updateData: any = { name: name.trim(), active: isActive, permissions }
      if (pin.length === 4 && pin === confirmPin) {
        updateData.pin_hash = await hashPin(pin)
      }

      const { error } = await supabase.from('staff').update(updateData).eq('id', editingStaff.id)
      if (error) throw error
      
      addToast(t('staff.staff_updated'), 'success')
      closeSheet()
      loadStaff()
    } catch (err: any) {
      addToast(err.message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteStaff = async () => {
    if (!staffToDelete) return
    try {
      const { error } = await supabase.from('staff').delete().eq('id', staffToDelete.id)
      if (error) throw error
      
      await supabase.from('audit_log').insert({
        cafe_id: cafe?.id,
        staff_id: owner?.id,
        is_owner: true,
        action: 'staff_deleted',
        details: { staff_name: staffToDelete.name }
      })

      addToast(t('staff.staff_deleted'), 'success')
      setStaffToDelete(null)
      loadStaff()
    } catch (err: any) {
      addToast(err.message, 'error')
    }
  }

  const closeSheet = () => {
    setShowAdd(false)
    setEditingStaff(null)
    setName('')
    setPin('')
    setConfirmPin('')
    setIsConfirmingPin(false)
    setPermissions({ sessions: true, reports: false, clients: false, settings: false })
    setIsActive(true)
  }

  const openEdit = (s: any) => {
    setEditingStaff(s)
    setName(s.name)
    setPermissions(s.permissions)
    setIsActive(s.active)
    setPin('')
    setConfirmPin('')
    setIsConfirmingPin(false)
  }

  const togglePermission = (key: keyof typeof permissions) => {
    if (key === 'sessions') return
    setPermissions(p => ({ ...p, [key]: !p[key] }))
  }

  const filteredStaff = staffList.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="min-h-screen bg-bg relative pb-12">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <header className="fixed top-0 left-0 right-0 h-14 bg-bg/92 backdrop-blur-md border-b border-border z-[100] flex items-center justify-between px-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text2 hover:text-text transition-colors">
          <ChevronLeft size={22} />
        </button>
        <span className="text-base font-bold text-text">{t('staff.title')}</span>
        <button onClick={() => setShowAdd(true)} className="p-2 -mr-2 text-accent">
          <Plus size={22} />
        </button>
      </header>

      <main className="pt-20 px-4 space-y-6 relative z-10">
        <Input
          placeholder={t('staff.search_placeholder')}
          icon={<Search size={16}/>}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-11"
        />

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredStaff.map((s) => (
              <motion.div
                key={s.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => openEdit(s)}
                className="card p-3.5 flex items-center justify-between active:border-text3 cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <Avatar name={s.name} size={40} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold text-text">{s.name}</span>
                      {!s.active && <span className="px-1.5 py-0.5 bg-surface2 text-text3 text-[9px] font-bold uppercase rounded-md">Inactif</span>}
                    </div>
                    <div className="flex gap-1.5 mt-1.5">
                      {s.permissions.reports && <div className="p-1 bg-surface2 border border-border rounded text-text3"><BarChart2 size={10}/></div>}
                      {s.permissions.clients && <div className="p-1 bg-surface2 border border-border rounded text-text3"><Users size={10}/></div>}
                      {s.permissions.settings && <div className="p-1 bg-surface2 border border-border rounded text-text3"><Settings size={10}/></div>}
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} className="text-text3" />
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredStaff.length === 0 && !isLoading && (
            <div className="py-20 text-center text-text3">
              <Users size={36} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Aucun employé trouvé</p>
            </div>
          )}
        </div>
      </main>

      {/* ADD/EDIT SHEET */}
      <BottomSheet isOpen={showAdd || !!editingStaff} onClose={closeSheet} title={editingStaff ? t('staff.edit_staff') : t('staff.add')}>
        <div className="space-y-6 pt-4">
          <Input placeholder={t('staff.name')} icon={<User size={16}/>} value={name} onChange={e => setName(e.target.value)} />

          {editingStaff && (
            <div className="flex items-center justify-between p-4 bg-surface2 border border-border rounded-xl">
              <div className="flex items-center gap-3">
                <Power size={18} className={isActive ? 'text-success' : 'text-text3'} />
                <span className="text-sm font-bold">{isActive ? t('staff.active') : t('staff.inactive')}</span>
              </div>
              <button 
                onClick={() => setIsActive(!isActive)}
                className={`w-11 h-6 rounded-full p-1 transition-colors ${isActive ? 'bg-success' : 'bg-surface'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              <label className="text-[12px] font-bold text-text3 uppercase tracking-widest">
                {isConfirmingPin ? t('staff.confirm_pin') : (editingStaff ? t('staff.change_pin') : t('staff.pin_setup'))}
              </label>
              <PINDots length={isConfirmingPin ? confirmPin.length : pin.length} />
            </div>
            <NumPad
              onPress={v => {
                if (isConfirmingPin) {
                  if (confirmPin.length < 4) {
                    const next = confirmPin + v
                    setConfirmPin(next)
                    if (next.length === 4 && next !== pin) {
                      addToast("Mismatch", "error")
                      setPin(''); setConfirmPin(''); setIsConfirmingPin(false)
                    }
                  }
                } else {
                  if (pin.length < 4) {
                    const next = pin + v
                    setPin(next)
                    if (next.length === 4) setIsConfirmingPin(true)
                  }
                }
              }}
              onDelete={() => isConfirmingPin ? setConfirmPin(confirmPin.slice(0, -1)) : setPin(pin.slice(0, -1))}
              className="w-full"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[11px] font-bold text-text3 uppercase tracking-widest">{t('staff.permissions')}</label>
            <div className="space-y-1">
              {[
                { id: 'sessions', icon: Timer, label: t('staff.perm_sessions'), locked: true },
                { id: 'reports', icon: BarChart2, label: t('staff.perm_reports'), locked: false },
                { id: 'clients', icon: Users, label: t('staff.perm_clients'), locked: false },
                { id: 'settings', icon: Settings, label: t('staff.perm_settings'), locked: false }
              ].map(item => (
                <div key={item.id} className="flex items-center justify-between h-14 border-b border-border last:border-0 px-1">
                  <div className="flex items-center gap-3">
                    <item.icon size={18} className="text-accent" />
                    <div>
                      <div className="text-[14px] font-medium text-text">{item.label}</div>
                      {item.locked && <div className="text-[11px] text-text3 italic">{t('staff.always_on')}</div>}
                    </div>
                  </div>
                  <button
                    disabled={item.locked}
                    onClick={() => togglePermission(item.id as any)}
                    className={`w-9 h-5 rounded-full p-1 transition-colors ${(item.locked || (permissions as any)[item.id]) ? 'bg-accent' : 'bg-surface2'}`}
                  >
                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${(item.locked || (permissions as any)[item.id]) ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              className="w-full h-12"
              isLoading={isSaving}
              onClick={editingStaff ? handleUpdateStaff : handleAddStaff}
              disabled={!name || (!editingStaff && (pin.length < 4 || confirmPin !== pin))}
            >
              {editingStaff ? t('common.save') : t('staff.create')}
            </Button>
            {editingStaff && (
              <Button variant="ghost" className="w-full h-12 border-error/20 text-error" onClick={() => setStaffToDelete(editingStaff)}>
                <Trash2 size={18} /> {t('staff.delete')}
              </Button>
            )}
          </div>
        </div>
      </BottomSheet>

      <ConfirmDialog
        isOpen={!!staffToDelete}
        onClose={() => setStaffToDelete(null)}
        onConfirm={handleDeleteStaff}
        variant="danger"
        title="Supprimer ?"
        message={`Voulez-vous vraiment supprimer ${staffToDelete?.name} ?`}
      />
    </div>
  )
}
