import { create } from "zustand";

export type Language = "fr" | "en" | "ar";
export type ToastType = "success" | "error" | "warning" | "info";
export type BillTemplate = "standard" | "minimal" | "elegant";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface UIState {
  language: Language;
  setLanguage: (lang: Language) => void;
  toasts: Toast[];
  addToast: (message: string, type: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  logo: string | null;
  setLogo: (logo: string | null) => void;
  billTemplate: BillTemplate;
  setBillTemplate: (template: BillTemplate) => void;
}

export const useUIStore = create<UIState>((set) => ({
  language: (localStorage.getItem("nook_lang") as Language) || "fr",
  setLanguage: (lang) => {
    localStorage.setItem("nook_lang", lang);
    set({ language: lang });
  },
  toasts: [],
  addToast: (message, type, duration = 3000) => {
    if (
      typeof message === "string" &&
      (message.includes("Failed to fetch") ||
        message.includes("failed to fetch"))
    ) {
      return;
    }
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  logo: localStorage.getItem("nook_logo"),
  setLogo: (logo) => {
    if (logo) {
      localStorage.setItem("nook_logo", logo);
    } else {
      localStorage.removeItem("nook_logo");
    }
    set({ logo });
  },
  billTemplate:
    (localStorage.getItem("nook_bill_template") as BillTemplate) || "standard",
  setBillTemplate: (template) => {
    localStorage.setItem("nook_bill_template", template);
    set({ billTemplate: template });
  },
}));
