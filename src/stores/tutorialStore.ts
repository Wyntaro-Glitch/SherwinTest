"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TutorialStore {
  completed: boolean;
  currentStep: number;
  setStep: (step: number) => void;
  complete: () => void;
  reset: () => void;
}

export const useTutorialStore = create<TutorialStore>()(
  persist(
    (set) => ({
      completed: false,
      currentStep: 0,
      setStep: (currentStep) => set({ currentStep }),
      complete: () => set({ completed: true, currentStep: 0 }),
      reset: () => set({ completed: false, currentStep: 0 }),
    }),
    { name: "sherwin_tutorial" }
  )
);
