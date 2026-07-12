"use client";

import { create } from "zustand";
import { UserProfile } from "@/utils/db";
import {
  getUserProfile as dbGetProfile,
  saveUserProfile as dbSaveProfile,
} from "@/utils/db";

interface UserProfileStore {
  profile: UserProfile | null;
  isLoading: boolean;
  loadProfile: () => Promise<void>;
  saveProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

const DEFAULT_PROFILE: UserProfile = {
  id: "default",
  name: "",
  email: "",
  phone: "",
  title: "",
  company: "",
  skills: [],
  experience: "",
  resumeText: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const useUserProfileStore = create<UserProfileStore>()((set, get) => ({
  profile: null,
  isLoading: false,

  loadProfile: async () => {
    set({ isLoading: true });
    try {
      const profile = await dbGetProfile("default");
      set({ profile: profile || DEFAULT_PROFILE, isLoading: false });
    } catch {
      set({ profile: DEFAULT_PROFILE, isLoading: false });
    }
  },

  saveProfile: async (data) => {
    const current = get().profile || DEFAULT_PROFILE;
    const updated: UserProfile = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await dbSaveProfile(updated);
    set({ profile: updated });
  },
}));
