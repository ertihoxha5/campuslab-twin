import { create } from "zustand";

export const usePlatformAuthStore = create((set) => ({
  status: "unknown",
  administrator: null,
  setLoading: () => set({ status: "loading" }),
  setSession: (administrator) =>
    set({ status: "authenticated", administrator }),
  clearSession: () => set({ status: "unauthenticated", administrator: null }),
  resetSession: () => set({ status: "unknown", administrator: null }),
}));
