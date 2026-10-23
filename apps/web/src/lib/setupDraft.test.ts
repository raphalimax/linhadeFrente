import { describe, expect, it } from 'vitest';
import { Rng, randomSetup, toIndex, validateSetup } from '@ldf/engine';
import {
  draftFromPlacements,
  draftSize,
  draftToPlacements,
  emptyDraft,
  isDraftComplete,
  movePlaced,
  nextRankToPlace,
  placeRank,
  remainingToPlace,
  removePlaced,
} from './setupDraft';

const i = (x: number, y: number) => toIndex({ x, y });

describe('setupDraft', () => {
  it('ida e volta com placements', () => {
    const placements = randomSetup('A', new Rng(1));
    const draft = draftFromPlacements(placements);
    expect(draftSize(draft)).toBe(40);
    expect(isDraftComplete(draft)).toBe(true);
    expect(validateSetup('A', draftToPlacements(draft))).toEqual([]);
  });

  it('coloca peças só na zona e respeita as quantidades', () => {
    let d = placeRank(emptyDraft, 'A', i(0, 0), 'general');
    expect(d[i(0, 0)]).toBe('general');
    expect(remainingToPlace(d).general).toBe(0);
    expect(placeRank(d, 'A', i(1, 0), 'general')).toBe(d); // esgotado
    expect(placeRank(d, 'A', i(0, 5), 'soldado')).toBe(d); // fora da zona
    d = placeRank(d, 'A', i(0, 0), 'cabo'); // substitui: General volta à bandeja
    expect(remainingToPlace(d).general).toBe(1);
    expect(placeRank(emptyDraft, 'B', i(0, 9), 'mina')[i(0, 9)]).toBe('mina');
  });

  it('move e troca peças colocadas', () => {
    let d = placeRank(emptyDraft, 'A', i(0, 0), 'general');
    d = placeRank(d, 'A', i(1, 0), 'mina');
    const swapped = movePlaced(d, 'A', i(0, 0), i(1, 0));
    expect(swapped[i(0, 0)]).toBe('mina');
    expect(swapped[i(1, 0)]).toBe('general');
    const moved = movePlaced(d, 'A', i(0, 0), i(5, 3));
    expect(moved[i(0, 0)]).toBeUndefined();
    expect(moved[i(5, 3)]).toBe('general');
    expect(movePlaced(d, 'A', i(0, 0), i(0, 4))).toBe(d);
    expect(movePlaced(d, 'A', i(9, 3), i(0, 0))).toBe(d);
    expect(movePlaced(d, 'A', i(0, 0), i(0, 0))).toBe(d);
  });

  it('remove peça e sugere a próxima patente', () => {
    const d = placeRank(emptyDraft, 'A', i(0, 0), 'agente');
    expect(removePlaced(d, i(0, 0))).toEqual({});
    expect(removePlaced(d, i(1, 1))).toBe(d);
    expect(nextRankToPlace(emptyDraft)).toBe('agente');
    expect(nextRankToPlace(d)).toBe('soldado');
    expect(nextRankToPlace(d, 'mina')).toBe('mina');
    expect(nextRankToPlace(d, 'agente')).toBe('soldado');
    expect(nextRankToPlace(draftFromPlacements(randomSetup('A', new Rng(2))))).toBeNull();
  });
});
