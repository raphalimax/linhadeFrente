'use client';

import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SettingsStore {
  /** Desliga os efeitos sonoros e a vibração. */
  muted: boolean;
  toggleMuted(): void;
}

/** Preferências do jogador, salvas no navegador. */
export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      muted: false,
      toggleMuted: () => set((s) => ({ muted: !s.muted })),
    }),
    { name: 'ldf:config', storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);

/** `true` depois que as preferências foram lidas do navegador. */
export function useSettingsHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => useSettings.persist?.onFinishHydration(cb) ?? (() => {}),
    () => useSettings.persist?.hasHydrated() ?? false,
    () => false,
  );
}
