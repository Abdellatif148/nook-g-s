import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Session } from '../types'

interface SessionState {
  activeSessions: Session[]
  setActiveSessions: (sessions: Session[]) => void
  addSession: (session: Session) => void
  updateSession: (session: Session) => void
  removeSession: (sessionId: string) => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      activeSessions: [],
      setActiveSessions: (sessions) => set({ activeSessions: sessions }),
      addSession: (session) =>
        set((state) => ({ activeSessions: [session, ...state.activeSessions] })),
      updateSession: (session) =>
        set((state) => ({
          activeSessions: state.activeSessions.map((s) =>
            s.id === session.id ? session : s
          ),
        })),
      removeSession: (sessionId) =>
        set((state) => ({
          activeSessions: state.activeSessions.filter((s) => s.id !== sessionId),
        })),
    }),
    {
      name: 'nook-session-storage',
    }
  )
)
