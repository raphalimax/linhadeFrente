import { describe, expect, it } from 'vitest';
import {
  BACK_ROW,
  EngineError,
  Rng,
  createGame,
  getPlayerView,
  pieceAt,
  randomSetup,
  smartRandomSetup,
  submitSetup,
  toIndex,
  validateSetup,
  type Placement,
  type Player,
  type Rank,
} from '../src';
import { startedGame } from './helpers';

const PLAYERS: Player[] = ['A', 'B'];

function codes(player: Player, placements: Placement[]) {
  return validateSetup(player, placements).map((i) => i.code);
}

describe('validateSetup', () => {
  it('aceita os posicionamentos aleatórios', () => {
    for (const p of PLAYERS) {
      expect(validateSetup(p, randomSetup(p, new Rng(1)))).toEqual([]);
      expect(validateSetup(p, smartRandomSetup(p, new Rng(1)))).toEqual([]);
    }
  });

  it('número errado de peças', () => {
    const setup = randomSetup('A', new Rng(1));
    expect(codes('A', setup.slice(1))).toContain('wrong_piece_count');
    expect(codes('A', [])).toContain('wrong_piece_count');
  });

  it('patente desconhecida', () => {
    const setup = randomSetup('A', new Rng(1));
    setup[0] = { ...setup[0]!, rank: 'rei' as Rank };
    expect(codes('A', setup)).toContain('unknown_rank');
  });

  it('quantidade errada de uma patente', () => {
    const setup = randomSetup('A', new Rng(1));
    const i = setup.findIndex((s) => s.rank === 'mina');
    setup[i] = { ...setup[i]!, rank: 'general' };
    const issues = validateSetup('A', setup);
    expect(issues.filter((x) => x.code === 'wrong_rank_count')).toHaveLength(2);
  });

  it('peça fora da zona do jogador', () => {
    const setup = randomSetup('A', new Rng(1));
    setup[0] = { ...setup[0]!, pos: { x: 0, y: 4 } };
    expect(codes('A', setup)).toContain('out_of_zone');
    expect(codes('B', randomSetup('A', new Rng(1)))).toContain('out_of_zone');
    setup[0] = { ...setup[0]!, pos: { x: -1, y: 0 } };
    expect(codes('A', setup)).toContain('out_of_zone');
  });

  it('casa repetida', () => {
    const setup = randomSetup('B', new Rng(1));
    setup[1] = { ...setup[1]!, pos: setup[0]!.pos };
    expect(codes('B', setup)).toContain('duplicate_cell');
  });
});

describe('posicionamento aleatório inteligente', () => {
  it('Prisioneiro no fundo, cercado de Minas, sem Minas na linha de frente', () => {
    const xs = new Set<number>();
    for (let seed = 0; seed < 200; seed++) {
      for (const player of PLAYERS) {
        const setup = smartRandomSetup(player, new Rng(seed));
        expect(validateSetup(player, setup)).toEqual([]);
        const at = new Map(setup.map((s) => [toIndex(s.pos), s.rank]));
        const prisoner = setup.find((s) => s.rank === 'prisioneiro')!.pos;
        xs.add(prisoner.x);
        expect(prisoner.y).toBe(BACK_ROW[player]);
        const forward = player === 'A' ? 1 : -1;
        const neighbors = [
          { x: prisoner.x - 1, y: prisoner.y },
          { x: prisoner.x + 1, y: prisoner.y },
          { x: prisoner.x, y: prisoner.y + forward },
        ].filter((p) => p.x >= 0 && p.x <= 9);
        for (const n of neighbors) expect(at.get(toIndex(n))).toBe('mina');
        const frontRow = player === 'A' ? 3 : 6;
        expect(setup.some((s) => s.rank === 'mina' && s.pos.y === frontRow)).toBe(false);
      }
    }
    // Cobre os cantos (só 2 vizinhos) e o meio.
    expect(xs.has(0)).toBe(true);
    expect(xs.has(9)).toBe(true);
    expect(xs.size).toBe(10);
  });

  it('é determinístico pela seed', () => {
    expect(smartRandomSetup('A', new Rng(5))).toEqual(smartRandomSetup('A', new Rng(5)));
    expect(randomSetup('B', new Rng(5))).toEqual(randomSetup('B', new Rng(5)));
  });
});

describe('submitSetup', () => {
  it('estado inicial', () => {
    const state = createGame({ seed: 9 });
    expect(state.phase).toBe('setup');
    expect(state.board.every((c) => c === null)).toBe(true);
    expect(state.turn).toBeNull();
    expect(state.ready).toEqual({ A: false, B: false });
  });

  it('coloca as peças com ids opacos e espera o outro jogador', () => {
    const setup = randomSetup('A', new Rng(2));
    const state = submitSetup(createGame({ seed: 1 }), 'A', setup);
    expect(state.phase).toBe('setup');
    expect(state.ready).toEqual({ A: true, B: false });
    for (const { pos, rank } of setup) {
      const piece = pieceAt(state, pos)!;
      expect(piece).toMatchObject({ owner: 'A', rank, revealed: false, hasMoved: false });
      // id derivado da casa, não da patente
      expect(piece.id).toBe(`A${String(toIndex(pos)).padStart(2, '0')}`);
    }
    expect(pieceAt(state, { x: -1, y: 0 })).toBeNull();
  });

  it('o adversário não vê nada durante o posicionamento', () => {
    let state = submitSetup(createGame({ seed: 1 }), 'A', randomSetup('A', new Rng(2)));
    expect(getPlayerView(state, 'B').board.every((c) => c === null)).toBe(true);
    state = submitSetup(state, 'B', randomSetup('B', new Rng(3)));
    expect(state.phase).toBe('playing');
  });

  it('quando os dois confirmam, sorteia quem começa (determinístico pela seed)', () => {
    const starters = new Set<Player>();
    for (let seed = 0; seed < 30; seed++) {
      const s = startedGame(seed);
      expect(s.phase).toBe('playing');
      expect(s.turn).toBe(s.firstPlayer);
      expect(s.rngState).not.toBe(seed);
      starters.add(s.firstPlayer!);
      expect(startedGame(seed).firstPlayer).toBe(s.firstPlayer);
    }
    expect(starters).toEqual(new Set(['A', 'B']));
  });

  it('erros: inválido, confirmado duas vezes, fora da fase', () => {
    const game = createGame({ seed: 1 });
    const bad = randomSetup('A', new Rng(1)).slice(1);
    expect(() => submitSetup(game, 'A', bad)).toThrow(EngineError);
    try {
      submitSetup(game, 'A', bad);
    } catch (e) {
      expect((e as EngineError).code).toBe('wrong_piece_count');
    }
    const a = submitSetup(game, 'A', randomSetup('A', new Rng(1)));
    expect(() => submitSetup(a, 'A', randomSetup('A', new Rng(1)))).toThrow(/already_ready/);
    const started = startedGame(1);
    expect(() => submitSetup(started, 'A', randomSetup('A', new Rng(1)))).toThrow(/not_in_setup/);
  });
});
