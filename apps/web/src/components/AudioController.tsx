'use client';

import { useEffect, useRef } from 'react';
import { installAudioUnlock } from '@/lib/audio';
import { startMusic, stopMusic } from '@/lib/music';
import { useSettings, useSettingsHydrated } from '@/store/settings';

/** Destrava o áudio no primeiro toque e liga/desliga a música de fundo. */
export function AudioController() {
  const hydrated = useSettingsHydrated();
  const muted = useSettings((s) => s.muted);
  const music = useSettings((s) => s.music);
  const want = hydrated && !muted && music;
  const wantRef = useRef(want);

  useEffect(() => {
    void useSettings.persist?.rehydrate();
  }, []);

  useEffect(() => {
    wantRef.current = want;
    if (want) startMusic();
    else stopMusic();
  }, [want]);

  useEffect(() => {
    const removeUnlock = installAudioUnlock(() => {
      if (wantRef.current && !document.hidden) startMusic();
    });
    // Pausa a música com a aba em segundo plano (economiza bateria).
    const onVisibility = () => {
      if (document.hidden) stopMusic();
      else if (wantRef.current) startMusic();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      removeUnlock();
      document.removeEventListener('visibilitychange', onVisibility);
      stopMusic();
    };
  }, []);

  return null;
}
