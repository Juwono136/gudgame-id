import { create } from "zustand";

type AuthUiState = {
  isSubmitting: boolean;
  setSubmitting: (value: boolean) => void;
};

export const useAuthUiStore = create<AuthUiState>((set) => ({
  isSubmitting: false,
  setSubmitting: (isSubmitting) => set({ isSubmitting }),
}));
