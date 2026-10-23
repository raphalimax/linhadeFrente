import { describe, expect, it } from 'vitest';
import {
  ARMY_SIZE,
  BACK_ROW,
  DIRECTIONS,
  LAKES,
  RANKS,
  RANK_INFO,
  Rng,
  SETUP_ROWS,
  armyRanks,
  inBounds,
  isInSetupZone,
  isLake,
  isLakeIndex,
  isRank,
  nextRandom,
  opponent,
  samePos,
  seedFromString,
  setupZone,
  toIndex,
  toPos,
} from '../src';

describe('constantes', () => {
  it('exército tem 40 peças com as quantidades da tabela', () => {
    const expected: Record<string, number> = {
      agente: 1,
      soldado: 8,
      cabo: 5,
      sargento: 4,
      subtenente: 4,
      tenente: 4,
      capitao: 3,
      major: 2,
      coronel: 1,
      general: 1,
      prisioneiro: 1,
      mina: 6,
    };
    for (const rank of RANKS) expect(RANK_INFO[rank].count).toBe(expected[rank]);
    expect(armyRanks()).toHaveLength(ARMY_SIZE);
    expect(ARMY_SIZE).toBe(40);
  });

  it('forças de 1 (Agente) a 10 (General); Mina e Prisioneiro imóveis', () => {
    const order = [
      'agente',
      'soldado',
      'cabo',
      'sargento',
      'subtenente',
      'tenente',
      'capitao',
      'major',
      'coronel',
      'general',
    ] as const;
    order.forEach((rank, i) => {
      expect(RANK_INFO[rank].strength).toBe(i + 1);
      expect(RANK_INFO[rank].movable).toBe(true);
    });
    expect(RANK_INFO.mina.movable).toBe(false);
    expect(RANK_INFO.prisioneiro.movable).toBe(false);
  });

  it('isRank e opponent', () => {
    expect(isRank('general')).toBe(true);
    expect(isRank('rei')).toBe(false);
    expect(isRank('toString')).toBe(false);
    expect(isRank(3)).toBe(false);
    expect(opponent('A')).toBe('B');
    expect(opponent('B')).toBe('A');
  });

  it('zonas de posicionamento e fileiras do fundo', () => {
    expect(SETUP_ROWS.A).toEqual([0, 1, 2, 3]);
    expect(SETUP_ROWS.B).toEqual([6, 7, 8, 9]);
    expect(BACK_ROW).toEqual({ A: 0, B: 9 });
    expect(setupZone('A')).toHaveLength(40);
    expect(setupZone('B').every((p) => p.y >= 6)).toBe(true);
    expect(isInSetupZone('A', { x: 0, y: 3 })).toBe(true);
    expect(isInSetupZone('A', { x: 0, y: 4 })).toBe(false);
    expect(isInSetupZone('B', { x: 9, y: 9 })).toBe(true);
    expect(isInSetupZone('B', { x: 10, y: 9 })).toBe(false);
  });
});

describe('tabuleiro', () => {
  it('limites e conversão de coordenadas', () => {
    expect(inBounds({ x: 0, y: 0 })).toBe(true);
    expect(inBounds({ x: 9, y: 9 })).toBe(true);
    expect(inBounds({ x: -1, y: 0 })).toBe(false);
    expect(inBounds({ x: 0, y: 10 })).toBe(false);
    expect(inBounds({ x: 10, y: 0 })).toBe(false);
    expect(inBounds({ x: 0, y: -1 })).toBe(false);
    expect(inBounds({ x: 0.5, y: 0 })).toBe(false);
    expect(inBounds({ x: 0, y: 1.5 })).toBe(false);
    for (let i = 0; i < 100; i++) expect(toIndex(toPos(i))).toBe(i);
    expect(toIndex({ x: 3, y: 4 })).toBe(43);
    expect(samePos({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
    expect(samePos({ x: 1, y: 2 }, { x: 2, y: 1 })).toBe(false);
    expect(DIRECTIONS).toHaveLength(4);
  });

  it('lagos nas 8 casas da especificação', () => {
    const lakes = ['2,4', '3,4', '2,5', '3,5', '6,4', '7,4', '6,5', '7,5'];
    expect(LAKES.map((p) => `${p.x},${p.y}`).sort()).toEqual(lakes.sort());
    let count = 0;
    for (let i = 0; i < 100; i++) {
      if (isLakeIndex(i)) {
        count++;
        expect(isLake(toPos(i))).toBe(true);
      }
    }
    expect(count).toBe(8);
    expect(isLake({ x: 4, y: 4 })).toBe(false);
  });
});

describe('RNG com seed', () => {
  it('é determinístico e fica em [0,1)', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 1000; i++) {
      const v = a.next();
      expect(v).toBe(b.next());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(a.state).toBe(b.state);
    expect(new Rng(1).next()).not.toBe(new Rng(2).next());
  });

  it('nextRandom é puro e coincide com a classe', () => {
    const [v, s] = nextRandom(7);
    const r = new Rng(7);
    expect(r.next()).toBe(v);
    expect(r.state).toBe(s);
    expect(nextRandom(7)).toEqual([v, s]);
  });

  it('int, pick e shuffle', () => {
    const r = new Rng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const n = r.int(5);
      expect(Number.isInteger(n)).toBe(true);
      seen.add(n);
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4]);
    expect(['x']).toContain(r.pick(['x']));
    expect(() => r.pick([])).toThrow(RangeError);
    const items = Array.from({ length: 20 }, (_, i) => i);
    const shuffled = r.shuffle(items);
    expect(shuffled).not.toBe(items);
    expect([...shuffled].sort((x, y) => x - y)).toEqual(items);
    expect(shuffled).not.toEqual(items);
  });

  it('seedFromString é estável', () => {
    expect(seedFromString('K7QF')).toBe(seedFromString('K7QF'));
    expect(seedFromString('K7QF')).not.toBe(seedFromString('K7QG'));
    expect(Number.isInteger(seedFromString(''))).toBe(true);
  });
});
