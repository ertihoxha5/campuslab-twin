import { create } from "zustand";

export const useAuthStore = create((set) => ({
  status: "unknown",
  user: null,
  setLoading: () => set({ status: "loading" }),
  setSession: (user) => set({ status: "authenticated", user }),
  clearSession: () => set({ status: "unauthenticated", user: null }),
  resetSession: () => set({ status: "unknown", user: null }),
}));
