/**
 * RNG determinístico (mulberry32). O estado é um inteiro de 32 bits, então cabe
 * no `GameState` e a partida inteira é reproduzível a partir da seed.
 */
export function nextRandom(state: number): [value: number, nextState: number] {
  const next = (state + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

/** Hash FNV-1a, útil para gerar seeds a partir de texto (ex.: código da sala). */
export function seedFromString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h | 0;
}

export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed | 0;
  }

  get state(): number {
    return this.s;
  }

  /** Número em [0, 1). */
  next(): number {
    const [value, state] = nextRandom(this.s);
    this.s = state;
    return value;
  }

  /** Inteiro em [0, max). */
  int(max: number): number {
    return Math.floor(this.next() * max);
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new RangeError('pick() em lista vazia');
    return items[this.int(items.length)] as T;
  }

  /** Cópia embaralhada (Fisher–Yates). */
  shuffle<T>(items: readonly T[]): T[] {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [out[i], out[j]] = [out[j] as T, out[i] as T];
    }
    return out;
  }
}
