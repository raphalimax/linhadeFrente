'use client';

import { useEffect, useState } from 'react';
import { useSettings } from '@/store/settings';

/** Liga/desliga o som (e a vibração). */
export function MuteButton() {
  const muted = useSettings((s) => s.muted);
  const toggle = useSettings((s) => s.toggleMuted);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    void Promise.resolve(useSettings.persist?.rehydrate()).then(() => setMounted(true));
  }, []);

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
      {!mounted ? '…' : muted ? '🔇' : '🔊'}
    </button>
  );
}
