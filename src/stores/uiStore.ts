import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
}

interface UIState {
  language: 'fr' | 'en'
  toasts: Toast[]
  setLanguage: (lang: 'fr' | 'en') => void
  addToast: (message: string, type: ToastType) => void
  removeToast: (id: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  language: (localStorage.getItem('nook_lang') as 'fr' | 'en') || 'fr',
  toasts: [],
  setLanguage: (lang) => {
    localStorage.setItem('nook_lang', lang)
    set({ language: lang })
  },
  addToast: (message, type) => {
    const id = Math.random().toString(36).substring(2, 9)
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }))

    const duration = type === 'error' ? 5000 : type === 'warning' ? 4000 : 3000
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }))
    }, duration)
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}))
