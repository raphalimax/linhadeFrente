'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore, useStoreHydrated } from '@/store/game';
import { GameScreen } from './GameScreen';
import { SetupScreen } from './SetupScreen';

/** Escolhe a tela pela fase da partida; sem partida, volta ao menu. */
export function GameRoot() {
  const hydrated = useStoreHydrated();
  const phase = useGameStore((s) => s.game?.phase ?? null);
  const router = useRouter();

  useEffect(() => {
    if (hydrated && phase === null) router.replace('/');
  }, [hydrated, phase, router]);

  if (!hydrated || phase === null) {
    return <p className="m-auto font-pixel text-xs opacity-70">Carregando…</p>;
  }
  return phase === 'setup' ? <SetupScreen /> : <GameScreen />;
}
