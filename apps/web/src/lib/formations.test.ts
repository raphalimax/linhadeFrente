import { describe, expect, it } from 'vitest';
import { Rng, randomSetup, validateSetup } from '@ldf/engine';
import {
  deleteFormation,
  fromFormation,
  loadFormations,
  saveFormation,
  toFormation,
} from './formations';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

describe('formações', () => {
  it('a mesma formação serve para os dois lados (girada 180°)', () => {
    const a = randomSetup('A', new Rng(4));
    const f = toFormation('Teste', 'A', a);
    expect(fromFormation(f, 'A')).toEqual(a);
    const b = fromFormation(f, 'B');
    expect(validateSetup('B', b)).toEqual([]);
    expect(fromFormation(toFormation('x', 'B', b), 'A')).toEqual(a);
  });

  it('salva, substitui pelo nome, lista e apaga', () => {
    const storage = new MemoryStorage();
    const f1 = toFormation('Defesa', 'A', randomSetup('A', new Rng(1)));
    const f2 = toFormation('Ataque', 'A', randomSetup('A', new Rng(2)));
    saveFormation(storage, f1);
    saveFormation(storage, f2);
    const f1b = toFormation('Defesa', 'A', randomSetup('A', new Rng(3)));
    const list = saveFormation(storage, f1b);
    expect(list.map((f) => f.name)).toEqual(['Ataque', 'Defesa']);
    expect(loadFormations(storage)).toEqual(list);
    expect(deleteFormation(storage, 'Ataque').map((f) => f.name)).toEqual(['Defesa']);
  });

  it('tolera armazenamento ausente, quebrado ou corrompido', () => {
    expect(loadFormations(undefined)).toEqual([]);
    const storage = new MemoryStorage();
    storage.setItem('ldf:formacoes', '{nope');
    expect(loadFormations(storage)).toEqual([]);
    storage.setItem('ldf:formacoes', '{"a":1}');
    expect(loadFormations(storage)).toEqual([]);
    storage.setItem(
      'ldf:formacoes',
      JSON.stringify([
        { name: 'ok', cells: [] },
        { name: 1 },
        null,
        { name: 'x', cells: [{ col: 0, row: 0, rank: 'rei' }] },
      ]),
    );
    expect(loadFormations(storage).map((f) => f.name)).toEqual(['ok']);
    const broken = new MemoryStorage();
    broken.setItem = () => {
      throw new Error('quota');
    };
    expect(saveFormation(broken, { name: 'a', cells: [] })).toHaveLength(1);
  });
});
