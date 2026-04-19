import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@supabase/supabase-js'
import { Cafe, Staff } from '../types'

interface AuthState {
  type: 'owner' | 'staff' | null
  owner: User | null
  staff: Staff | null
  cafe: Cafe | null
  isLoading: boolean
  setOwner: (user: User | null) => void
  setStaff: (staff: Staff | null) => void
  setCafe: (cafe: Cafe | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      type: null,
      owner: null,
      staff: null,
      cafe: null,
      isLoading: true,
      setOwner: (user) => set((state) => ({ 
        owner: user, 
        type: user ? 'owner' : (state.type === 'staff' ? 'staff' : null) 
      })),
      setStaff: (staff) => set((state) => ({ 
        staff, 
        type: staff ? 'staff' : (state.type === 'owner' ? 'owner' : null) 
      })),
      setCafe: (cafe) => set({ cafe }),
      setLoading: (loading) => set({ isLoading: loading }),
      logout: () => {
        localStorage.removeItem('nook_staff_session')
        set({ type: null, owner: null, staff: null, cafe: null })
      },
    }),
    {
      name: 'nook-auth-storage',
      partialize: (state) => ({ type: state.type, owner: state.owner, staff: state.staff, cafe: state.cafe }),
    }
  )
)
