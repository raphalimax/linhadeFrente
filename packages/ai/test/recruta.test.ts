import { describe, expect, it } from 'vitest';
import {
  Rng,
  applyMove,
  createGame,
  getPlayerView,
  submitSetup,
  toIndex,
  validateMove,
  validateSetup,
  type Cell,
  type GameState,
  type Player,
  type Rank,
} from '@ldf/engine';
import { DIFFICULTIES, getBot, recruta, recrutaWeight } from '../src';

interface Spec {
  x: number;
  y: number;
  owner: Player;
  rank: Rank;
  revealed?: boolean;
  hasMoved?: boolean;
}

function makeState(pieces: Spec[], turn: Player = 'A'): GameState {
  const board: Cell[] = Array.from({ length: 100 }, () => null);
  for (const p of pieces) {
    const i = toIndex(p);
    board[i] = {
      id: `${p.owner}${i}`,
      owner: p.owner,
      rank: p.rank,
      revealed: p.revealed ?? false,
      hasMoved: p.hasMoved ?? false,
    };
  }
  return { ...createGame({ seed: 1 }), phase: 'playing', ready: { A: true, B: true }, turn, board };
}

const mv = (fx: number, fy: number, tx: number, ty: number) => ({
  from: { x: fx, y: fy },
  to: { x: tx, y: ty },
});

describe('recrutaWeight', () => {
  const state = makeState([
    { x: 4, y: 4, owner: 'A', rank: 'major' },
    { x: 4, y: 5, owner: 'B', rank: 'capitao', revealed: true },
    { x: 5, y: 4, owner: 'B', rank: 'general', revealed: true },
    { x: 3, y: 4, owner: 'B', rank: 'major', revealed: true },
    { x: 4, y: 3, owner: 'B', rank: 'mina' },
    { x: 0, y: 0, owner: 'A', rank: 'soldado' },
    { x: 0, y: 1, owner: 'B', rank: 'cabo', hasMoved: true },
    { x: 1, y: 1, owner: 'B', rank: 'tenente', revealed: true },
    { x: 9, y: 0, owner: 'A', rank: 'sargento' },
  ]);
  const view = getPlayerView(state, 'A');

  it('ataque que vence pesa muito; que perde, quase nada; empate, neutro', () => {
    expect(recrutaWeight(view, mv(4, 4, 4, 5))).toBe(8);
    expect(recrutaWeight(view, mv(4, 4, 5, 4))).toBe(0.1);
    expect(recrutaWeight(view, mv(4, 4, 3, 4))).toBe(1);
  });

  it('peça valiosa evita atacar peça oculta parada (possível Mina)', () => {
    expect(recrutaWeight(view, mv(4, 4, 4, 3))).toBe(0.5);
  });

  it('atacar peça oculta que já se moveu é atraente', () => {
    expect(recrutaWeight(view, mv(0, 0, 0, 1))).toBe(1.5);
  });

  it('evita parar ao lado de peça revelada mais forte', () => {
    expect(recrutaWeight(view, mv(0, 0, 1, 0))).toBe(0.3);
    expect(recrutaWeight(view, mv(9, 0, 8, 0))).toBe(1);
  });

  it('ignora vizinhos imóveis, próprios ou fora do tabuleiro', () => {
    const s = makeState([
      { x: 0, y: 0, owner: 'A', rank: 'soldado' },
      { x: 2, y: 0, owner: 'B', rank: 'mina', revealed: true },
      { x: 1, y: 1, owner: 'A', rank: 'general' },
      { x: 9, y: 9, owner: 'B', rank: 'sargento' },
    ]);
    expect(recrutaWeight(getPlayerView(s, 'A'), mv(0, 0, 1, 0))).toBe(1);
  });
});

describe('recruta', () => {
  it('prefere o ataque vencedor', () => {
    const s = makeState([
      { x: 4, y: 4, owner: 'A', rank: 'general' },
      { x: 4, y: 5, owner: 'B', rank: 'soldado', revealed: true },
      { x: 9, y: 9, owner: 'B', rank: 'sargento' },
    ]);
    const view = getPlayerView(s, 'A');
    const rng = new Rng(1);
    let attacks = 0;
    for (let i = 0; i < 200; i++) {
      const m = recruta.chooseMove(view, rng);
      if (m.to.y === 5 && m.to.x === 4) attacks++;
    }
    // 8 / (8 + 3) ≈ 73%
    expect(attacks).toBeGreaterThan(120);
  });

  it('sem jogadas legais lança erro', () => {
    const s = makeState([
      { x: 0, y: 0, owner: 'A', rank: 'general' },
      { x: 9, y: 9, owner: 'B', rank: 'sargento' },
    ]);
    expect(() => recruta.chooseMove(getPlayerView(s, 'B'), new Rng(1))).toThrow();
  });

  it('posicionamento válido', () => {
    for (const p of ['A', 'B'] as const) {
      expect(validateSetup(p, recruta.chooseSetup(p, new Rng(3)))).toEqual([]);
    }
  });

  it('Recruta x Recruta: sempre joga lances legais e a partida termina', () => {
    for (let seed = 0; seed < 10; seed++) {
      const rng = new Rng(seed);
      let s = createGame({ seed });
      s = submitSetup(s, 'A', recruta.chooseSetup('A', rng));
      s = submitSetup(s, 'B', recruta.chooseSetup('B', rng));
      while (s.phase === 'playing' && s.ply < 5000) {
        const turn = s.turn as Player;
        const move = recruta.chooseMove(getPlayerView(s, turn), rng);
        expect(validateMove(s, turn, move)).toBeNull();
        s = applyMove(s, move).state;
      }
      expect(s.phase).toBe('finished');
    }
  });
});

describe('dificuldades', () => {
  it('todas têm bot; só a Recruta está disponível por enquanto', () => {
    for (const d of DIFFICULTIES) expect(getBot(d.id)).toBeDefined();
    expect(DIFFICULTIES.filter((d) => d.available).map((d) => d.id)).toEqual(['recruta']);
  });
});
