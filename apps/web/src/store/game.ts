'use client';

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  EngineError,
  Rng,
  applyMove,
  createGame,
  forfeit,
  getPlayerView,
  submitSetup,
  type GameState,
  type Move,
  type MoveRecord,
  type Player,
} from '@ldf/engine';
import { getBot, type Difficulty } from '@ldf/ai';
import { draftToPlacements, emptyDraft, isDraftComplete, type Draft } from '@/lib/setupDraft';

export const HUMAN: Player = 'A';
export const AI: Player = 'B';

function randomSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! | 0;
}

interface GameStore {
  difficulty: Difficulty;
  /**
   * Estado completo da partida local. Faz o papel do "servidor": a UI e a IA
   * só enxergam `getPlayerView` dele.
   */
  game: GameState | null;
  aiRngState: number;
  draft: Draft;
  lastRecord: MoveRecord | null;
  /** Último combate (fica na tela até o próximo). */
  lastCombat: MoveRecord | null;

  newGame(difficulty: Difficulty): void;
  setDraft(draft: Draft): void;
  confirmSetup(): void;
  /** Devolve o código do erro se a jogada for ilegal. */
  playHuman(move: Move): string | null;
  playAi(): void;
  resign(): void;
  quit(): void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      difficulty: 'recruta',
      game: null,
      aiRngState: 0,
      draft: emptyDraft,
      lastRecord: null,
      lastCombat: null,

      newGame(difficulty) {
        const rng = new Rng(randomSeed());
        let game = createGame({ seed: randomSeed() });
        // A IA posiciona na hora; o jogador não vê nada do lado dela.
        game = submitSetup(game, AI, getBot(difficulty).chooseSetup(AI, rng));
        set({
          difficulty,
          game,
          aiRngState: rng.state,
          draft: emptyDraft,
          lastRecord: null,
          lastCombat: null,
        });
      },

      setDraft(draft) {
        set({ draft });
      },

      confirmSetup() {
        const { game, draft } = get();
        if (!game || game.phase !== 'setup' || !isDraftComplete(draft)) return;
        set({ game: submitSetup(game, HUMAN, draftToPlacements(draft)) });
      },

      playHuman(move) {
        const { game } = get();
        if (!game || game.turn !== HUMAN) return 'not_your_turn';
        try {
          const { state, record } = applyMove(game, move);
          set({
            game: state,
            lastRecord: record,
            lastCombat: record.combat ? record : get().lastCombat,
          });
          return null;
        } catch (e) {
          if (e instanceof EngineError) return e.code;
          throw e;
        }
      },

      playAi() {
        const { game, difficulty, aiRngState } = get();
        if (!game || game.phase !== 'playing' || game.turn !== AI) return;
        const rng = new Rng(aiRngState);
        const move = getBot(difficulty).chooseMove(getPlayerView(game, AI), rng);
        const { state, record } = applyMove(game, move);
        set({
          game: state,
          lastRecord: record,
          lastCombat: record.combat ? record : get().lastCombat,
          aiRngState: rng.state,
        });
      },

      resign() {
        const { game } = get();
        if (!game || game.phase === 'finished') return;
        set({ game: forfeit(game, HUMAN, 'resignation') });
      },

      quit() {
        set({ game: null, draft: emptyDraft, lastRecord: null, lastCombat: null });
      },
    }),
    {
      name: 'ldf:partida',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

/** RNG novo com seed aleatória (para os botões de posicionamento aleatório). */
export function freshRng(): Rng {
  return new Rng(randomSeed());
}

/** Carrega a partida salva no localStorage (uma vez, no cliente). */
export function useStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useGameStore.persist?.hasHydrated() ?? false);
  useEffect(() => {
    if (hydrated) return;
    // No servidor não há localStorage e o `persist` nem é instalado.
    void Promise.resolve(useGameStore.persist?.rehydrate()).then(() => setHydrated(true));
  }, [hydrated]);
  return hydrated;
}
