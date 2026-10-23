import { describe, expect, it } from 'vitest';
import {
  Rng,
  applyMove,
  createGame,
  forfeit,
  randomSetup,
  submitSetup,
  validateSetup,
  type Placement,
  type Rank,
} from '../src';
import { makeState, mv, playRandomGame } from './helpers';

describe('fim de jogo', () => {
  it('resgatar o Prisioneiro vence na hora', () => {
    const s = makeState([
      { x: 0, y: 5, owner: 'A', rank: 'agente' },
      { x: 0, y: 6, owner: 'B', rank: 'prisioneiro' },
      { x: 9, y: 9, owner: 'B', rank: 'general' },
    ]);
    const { state } = applyMove(s, mv(0, 5, 0, 6));
    expect(state.result).toEqual({ winner: 'A', reason: 'prisoner_rescued' });
    expect(() => applyMove(state, mv(0, 6, 0, 7))).toThrow(/game_not_in_progress/);
  });

  it('quem fica só com Minas + Prisioneiro perde (atacante perdeu a última peça móvel)', () => {
    const s = makeState([
      { x: 4, y: 4, owner: 'A', rank: 'tenente' },
      { x: 0, y: 0, owner: 'A', rank: 'prisioneiro' },
      { x: 1, y: 0, owner: 'A', rank: 'mina' },
      { x: 4, y: 5, owner: 'B', rank: 'general' },
      { x: 9, y: 9, owner: 'B', rank: 'prisioneiro' },
    ]);
    const { state } = applyMove(s, mv(4, 4, 4, 5));
    expect(state.result).toEqual({ winner: 'B', reason: 'no_movable_pieces' });
  });

  it('quem fica só com Minas + Prisioneiro perde (defensor perdeu a última peça móvel)', () => {
    const s = makeState([
      { x: 4, y: 4, owner: 'A', rank: 'general' },
      { x: 4, y: 5, owner: 'B', rank: 'cabo' },
      { x: 9, y: 9, owner: 'B', rank: 'mina' },
    ]);
    const { state } = applyMove(s, mv(4, 4, 4, 5));
    expect(state.result).toEqual({ winner: 'A', reason: 'no_movable_pieces' });
    expect(state.phase).toBe('finished');
    expect(state.turn).toBeNull();
  });

  it('os dois sem peças móveis ao mesmo tempo: empate', () => {
    const s = makeState([
      { x: 4, y: 4, owner: 'A', rank: 'major' },
      { x: 4, y: 5, owner: 'B', rank: 'major' },
      { x: 0, y: 0, owner: 'A', rank: 'prisioneiro' },
      { x: 9, y: 9, owner: 'B', rank: 'prisioneiro' },
    ]);
    const { state } = applyMove(s, mv(4, 4, 4, 5));
    expect(state.result).toEqual({ winner: null, reason: 'no_movable_pieces' });
  });

  it('adversário sem nenhum movimento legal (bloqueado) perde', () => {
    const s = makeState(
      [
        { x: 0, y: 9, owner: 'A', rank: 'coronel' },
        { x: 1, y: 9, owner: 'A', rank: 'mina' },
        { x: 0, y: 8, owner: 'A', rank: 'mina' },
        { x: 5, y: 5, owner: 'B', rank: 'sargento' },
        { x: 5, y: 4, owner: 'A', rank: 'soldado', id: 'Ax' },
      ],
      'B',
    );
    // Sem o Soldado, o Coronel de A fica cercado pelas próprias Minas e pela borda.
    const blocked = makeState(
      [
        { x: 0, y: 9, owner: 'A', rank: 'coronel' },
        { x: 1, y: 9, owner: 'A', rank: 'mina' },
        { x: 0, y: 8, owner: 'A', rank: 'mina' },
        { x: 5, y: 5, owner: 'B', rank: 'sargento' },
      ],
      'B',
    );
    const { state } = applyMove(blocked, mv(5, 5, 5, 6));
    expect(state.result).toEqual({ winner: 'B', reason: 'no_legal_moves' });
    // Com uma peça livre, o jogo continua.
    expect(applyMove(s, mv(5, 5, 5, 6)).state.phase).toBe('playing');
  });

  it('jogador da vez sem movimentos legais logo no início perde', () => {
    // A: as 6 casas da linha de frente que dão para fora (colunas 0,1,4,5,8,9) são Minas.
    const front = [0, 1, 4, 5, 8, 9];
    const zone: { x: number; y: number }[] = [];
    for (let y = 0; y <= 3; y++) for (let x = 0; x < 10; x++) zone.push({ x, y });
    const rest = randomSetup('A', new Rng(1))
      .map((p) => p.rank)
      .filter((r) => r !== 'mina');
    const others = zone.filter((p) => !(p.y === 3 && front.includes(p.x)));
    const setupA: Placement[] = [
      ...front.map((x) => ({ pos: { x, y: 3 }, rank: 'mina' as Rank })),
      ...others.map((pos, i) => ({ pos, rank: rest[i]! })),
    ];
    expect(validateSetup('A', setupA)).toEqual([]);

    const outcomes = new Set<string>();
    for (let seed = 0; seed < 20; seed++) {
      let s = createGame({ seed });
      s = submitSetup(s, 'A', setupA);
      s = submitSetup(s, 'B', randomSetup('B', new Rng(seed)));
      if (s.firstPlayer === 'A') {
        expect(s.result).toEqual({ winner: 'B', reason: 'no_legal_moves' });
        outcomes.add('A');
      } else {
        expect(s.phase).toBe('playing');
        outcomes.add('B');
      }
    }
    expect(outcomes).toEqual(new Set(['A', 'B']));
  });

  it('desistência, timeout e abandono', () => {
    const s = makeState([
      { x: 0, y: 0, owner: 'A', rank: 'sargento' },
      { x: 9, y: 9, owner: 'B', rank: 'sargento' },
    ]);
    expect(forfeit(s, 'A').result).toEqual({ winner: 'B', reason: 'resignation' });
    expect(forfeit(s, 'B', 'timeout').result).toEqual({ winner: 'A', reason: 'timeout' });
    expect(forfeit(s, 'A', 'abandonment').result).toEqual({ winner: 'B', reason: 'abandonment' });
    // Também durante o posicionamento.
    expect(forfeit(createGame({ seed: 1 }), 'B').phase).toBe('finished');
    expect(() => forfeit(forfeit(s, 'A'), 'B')).toThrow(/game_already_finished/);
  });

  it('partidas aleatórias sempre terminam e conservam as peças', () => {
    const reasons = new Set<string>();
    const problems: string[] = [];
    for (let seed = 0; seed < 20; seed++) {
      const final = playRandomGame(seed, (state) => {
        for (const p of ['A', 'B'] as const) {
          const onBoard = state.board.filter((c) => c?.owner === p).length;
          if (onBoard + state.lost[p].length !== 40)
            problems.push(`seed ${seed} ply ${state.ply}: ${p}`);
        }
        const ids = state.board.filter((c) => c !== null).map((c) => c.id);
        if (new Set(ids).size !== ids.length) problems.push(`seed ${seed}: ids repetidos`);
      });
      expect(final.phase).toBe('finished');
      reasons.add(final.result!.reason);
    }
    expect(problems).toEqual([]);
    expect(reasons).toContain('prisoner_rescued');
    expect(reasons).toContain('no_movable_pieces');
  });
});
