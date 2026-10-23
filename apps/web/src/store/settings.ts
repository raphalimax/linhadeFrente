'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SettingsStore {
  muted: boolean;
  toggleMuted(): void;
}

/** Preferências do jogador (som), salvas no navegador. */
export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      muted: false,
      toggleMuted: () => set((s) => ({ muted: !s.muted })),
    }),
    { name: 'ldf:config', storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);
