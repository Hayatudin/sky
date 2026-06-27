import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface UIState {
  // 1. Sidebar & View Settings (Persistent)
  sidebarOpen: boolean;
  activeFilterTab: string;
  selectedTemplateId: string | null;
  toggleSidebar: () => void;
  setActiveFilterTab: (tab: string) => void;
  setSelectedTemplateId: (id: string | null) => void;

  // 2. Global Toast System (Transient / Non-persistent)
  toasts: Toast[];
  addToast: (message: string, type: Toast["type"]) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Defaults
      sidebarOpen: true,
      activeFilterTab: "all",
      selectedTemplateId: null,
      toasts: [],

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setActiveFilterTab: (tab) => set({ activeFilterTab: tab }),
      setSelectedTemplateId: (id) => set({ selectedTemplateId: id }),

      addToast: (message, type) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast: Toast = { id, message, type };
        
        set((state) => ({ toasts: [...state.toasts, newToast] }));

        // Auto-remove toast after 4 seconds
        setTimeout(() => {
          get().removeToast(id);
        }, 4000);
      },

      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),
    }),
    {
      name: "coolstaff-ui-state", // LocalStorage key
      partialize: (state) => ({
        // Only persist these specific UI properties across reloads
        sidebarOpen: state.sidebarOpen,
        activeFilterTab: state.activeFilterTab,
        selectedTemplateId: state.selectedTemplateId,
      }),
    }
  )
);
