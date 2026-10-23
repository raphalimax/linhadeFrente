'use client';

import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SettingsStore {
  /** Desliga todo o som (efeitos, música) e a vibração. */
  muted: boolean;
  /** Música de fundo. */
  music: boolean;
  toggleMuted(): void;
  toggleMusic(): void;
}

/** Preferências do jogador, salvas no navegador. */
export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      muted: false,
      music: true,
      toggleMuted: () => set((s) => ({ muted: !s.muted })),
      toggleMusic: () => set((s) => ({ music: !s.music })),
    }),
    {
      name: 'ldf:config',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      migrate: (persisted) => ({ music: true, ...(persisted as object) }) as SettingsStore,
    },
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
