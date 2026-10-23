'use client';

import { useRouter } from 'next/navigation';
import { DIFFICULTIES, type Difficulty } from '@ldf/ai';
import { useGameStore, useStoreHydrated } from '@/store/game';
import { MuteButton } from './MuteButton';

const DESCRIPTIONS: Record<Difficulty, string> = {
  recruta: 'Fácil — joga quase ao acaso.',
  sargento: 'Médio — em breve.',
  general: 'Difícil — em breve.',
};

export function MenuScreen() {
  const hydrated = useStoreHydrated();
  const inProgress = useGameStore((s) => s.game !== null && s.game.phase !== 'finished');
  const newGame = useGameStore((s) => s.newGame);
  const router = useRouter();

  function start(difficulty: Difficulty) {
    newGame(difficulty);
    router.push('/jogo');
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-8">
      <h1 className="text-center font-pixel text-2xl leading-relaxed text-yellow-200 [text-shadow:3px_3px_0_#000]">
        Linha de Frente
      </h1>

      <div className="flex justify-center">
        <MuteButton />
      </div>

      {hydrated && inProgress && (
        <button type="button" className="btn btn-primary" onClick={() => router.push('/jogo')}>
          Continuar partida
        </button>
      )}

      <section className="panel">
        <h2 className="font-pixel text-xs">Contra a IA</h2>
        {DIFFICULTIES.map((d) => (
          <button
            key={d.id}
            type="button"
            className="btn flex flex-col items-start text-left"
            disabled={!d.available}
            onClick={() => start(d.id)}
          >
            <span className="font-pixel text-xs">{d.label}</span>
            <span className="text-base opacity-80">{DESCRIPTIONS[d.id]}</span>
          </button>
        ))}
      </section>

      <section className="panel">
        <h2 className="font-pixel text-xs">Online</h2>
        <button type="button" className="btn" disabled>
          Criar sala — em breve
        </button>
        <button type="button" className="btn" disabled>
          Entrar com código — em breve
        </button>
      </section>
    </main>
  );
}
