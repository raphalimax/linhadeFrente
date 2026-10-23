'use client';

import { useSettings, useSettingsHydrated } from '@/store/settings';

/** Liga/desliga os efeitos sonoros (e a vibração). */
export function MuteButton() {
  const hydrated = useSettingsHydrated();
  const muted = useSettings((s) => s.muted);
  const toggle = useSettings((s) => s.toggleMuted);
  const label = muted ? 'Ligar som' : 'Desligar som';
  return (
    <button
      type="button"
      className="btn px-2 py-0 text-xl"
      onClick={toggle}
      aria-label={label}
      title={label}
      aria-pressed={!muted}
    >
      {!hydrated ? '…' : muted ? '🔇' : '🔊'}
    </button>
  );
}
