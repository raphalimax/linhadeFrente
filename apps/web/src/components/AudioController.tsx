'use client';

import { useEffect } from 'react';
import { installAudioUnlock } from '@/lib/audio';
import { useSettings } from '@/store/settings';

/** Carrega as preferências e destrava o áudio a cada toque (necessário no celular). */
export function AudioController() {
  useEffect(() => {
    void useSettings.persist?.rehydrate();
    return installAudioUnlock(() => {});
  }, []);
  return null;
}
