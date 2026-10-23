'use client';

import { useSettings, useSettingsHydrated } from '@/store/settings';

/** Botões de som (efeitos + vibração) e de música de fundo. */
export function MuteButton() {
  const hydrated = useSettingsHydrated();
  const muted = useSettings((s) => s.muted);
  const music = useSettings((s) => s.music);
  const toggleMuted = useSettings((s) => s.toggleMuted);
  const toggleMusic = useSettings((s) => s.toggleMusic);

  const soundLabel = muted ? 'Ligar som' : 'Desligar som';
  const musicLabel = music ? 'Desligar música' : 'Ligar música';
  return (
    <div className="flex gap-1">
      <button
        type="button"
        className="btn px-2 py-0 text-xl"
        onClick={toggleMuted}
        aria-label={soundLabel}
        title={soundLabel}
        aria-pressed={!muted}
      >
        {!hydrated ? '…' : muted ? '🔇' : '🔊'}
      </button>
      <button
        type="button"
        className={`btn px-2 py-0 text-xl ${hydrated && (!music || muted) ? 'line-through opacity-50' : ''}`}
        onClick={toggleMusic}
        disabled={muted}
        aria-label={musicLabel}
        title={musicLabel}
        aria-pressed={music}
      >
        ♫
      </button>
    </div>
  );
}
