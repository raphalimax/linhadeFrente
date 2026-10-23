import { describe, expect, it } from 'vitest';
import {
  RANKS,
  applyMove,
  createGame,
  getLegalMoves,
  getLegalMovesForView,
  getPlayerView,
  hasMovablePiece,
  opponent,
  remainingCounts,
  validateMove,
  validateMoveForView,
  type Player,
} from '../src';
import { makeState, moveKey, mv, playRandomGame } from './helpers';

describe('getPlayerView', () => {
  it('peças inimigas não reveladas não carregam a patente', () => {
    const s = makeState([
      { x: 0, y: 0, owner: 'A', rank: 'general' },
      { x: 9, y: 9, owner: 'B', rank: 'coronel', hasMoved: true },
      { x: 8, y: 9, owner: 'B', rank: 'major', revealed: true },
    ]);
    const view = getPlayerView(s, 'A');
    expect(view.board[0]).toEqual({
      id: 'A00',
      owner: 'A',
      hidden: false,
      rank: 'general',
      revealed: false,
      hasMoved: false,
    });
    expect(view.board[99]).toEqual({ id: 'B99', owner: 'B', hidden: true, hasMoved: true });
    expect(view.board[98]).toMatchObject({ hidden: false, rank: 'major', revealed: true });
    expect(JSON.stringify(view)).not.toContain('coronel');
    expect(JSON.stringify(view)).not.toContain('rngState');
  });

  it('ao fim da partida tudo é revelado', () => {
    const s = makeState([
      { x: 4, y: 4, owner: 'A', rank: 'general' },
      { x: 4, y: 5, owner: 'B', rank: 'prisioneiro' },
      { x: 9, y: 9, owner: 'B', rank: 'coronel' },
    ]);
    const { state } = applyMove(s, mv(4, 4, 4, 5));
    const view = getPlayerView(state, 'A');
    expect(view.result).toEqual({ winner: 'A', reason: 'prisoner_rescued' });
    expect(view.board[99]).toMatchObject({ hidden: false, rank: 'coronel' });
  });

  it('nunca vaza patentes ocultas em partidas aleatórias', () => {
    const problems: string[] = [];
    let views = 0;
    for (const seed of [3, 4]) {
      playRandomGame(seed, (state) => {
        if (state.phase !== 'playing') return;
        for (const me of ['A', 'B'] as Player[]) {
          const view = getPlayerView(state, me);
          views++;
          view.board.forEach((vp, i) => {
            const real = state.board[i];
            if (!real) {
              if (vp !== null) problems.push(`ply ${state.ply}: casa ${i} deveria estar vazia`);
            } else if (real.owner === me || real.revealed) {
              if (vp?.hidden !== false || vp.rank !== real.rank)
                problems.push(`ply ${state.ply}: casa ${i} visível errada`);
            } else if (Object.keys(vp!).sort().join() !== 'hasMoved,hidden,id,owner') {
              problems.push(`ply ${state.ply}: casa ${i} vazou dados`);
            }
          });
        }
      });
    }
    expect(problems).toEqual([]);
    expect(views).toBeGreaterThan(100);
  });

  it('jogadas legais pela visão = jogadas legais pelo estado', () => {
    for (const seed of [5, 6]) {
      playRandomGame(
        seed,
        (state) => {
          if (state.phase !== 'playing' || state.ply % 10 !== 0) return;
          const turn = state.turn!;
          const view = getPlayerView(state, turn);
          expect(getLegalMovesForView(view).map(moveKey).sort()).toEqual(
            getLegalMoves(state, turn).map(moveKey).sort(),
          );
          expect(getLegalMovesForView(getPlayerView(state, opponent(turn)))).toEqual([]);
          for (const m of getLegalMoves(state, turn).slice(0, 5)) {
            expect(validateMoveForView(view, m)).toBe(validateMove(state, turn, m));
          }
        },
        500,
      );
    }
  });

  it('validateMoveForView: fase e turno', () => {
    const s = makeState([
      { x: 0, y: 0, owner: 'A', rank: 'general' },
      { x: 0, y: 1, owner: 'B', rank: 'coronel' },
    ]);
    expect(validateMoveForView(getPlayerView(s, 'B'), mv(0, 1, 0, 2))).toBe('not_your_turn');
    expect(validateMoveForView(getPlayerView(createGame({ seed: 1 }), 'A'), mv(0, 0, 0, 1))).toBe(
      'game_not_in_progress',
    );
    // Atacar peça oculta é legal; o resultado só o motor sabe.
    expect(validateMoveForView(getPlayerView(s, 'A'), mv(0, 0, 0, 1))).toBeNull();
    expect(getLegalMovesForView(getPlayerView(createGame({ seed: 1 }), 'A'))).toEqual([]);
  });

  it('peças ocultas contam como imóveis para quem não sabe a patente', () => {
    const s = makeState([
      { x: 0, y: 0, owner: 'A', rank: 'general' },
      { x: 9, y: 9, owner: 'B', rank: 'coronel' },
    ]);
    expect(hasMovablePiece(getPlayerView(s, 'A').board, 'B')).toBe(false);
    expect(hasMovablePiece(s.board, 'B')).toBe(true);
  });
});

describe('remainingCounts', () => {
  it('desconta as baixas do exército completo', () => {
    const counts = remainingCounts(['soldado', 'soldado', 'mina', 'general']);
    expect(counts.soldado).toBe(6);
    expect(counts.mina).toBe(5);
    expect(counts.general).toBe(0);
    expect(counts.agente).toBe(1);
    expect(Object.keys(counts).sort()).toEqual([...RANKS].sort());
    expect(Object.values(remainingCounts([])).reduce((a, b) => a + b, 0)).toBe(40);
  });
});
