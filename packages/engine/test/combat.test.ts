import { describe, expect, it } from 'vitest';
import { RANKS, RANK_INFO, applyMove, getPlayerView, resolveCombat, type Rank } from '../src';
import { makeState, mv } from './helpers';

const MOBILE = RANKS.filter((r) => RANK_INFO[r].movable);

describe('resolveCombat', () => {
  it('força maior vence, iguais saem as duas (matriz completa)', () => {
    for (const a of MOBILE) {
      for (const d of MOBILE) {
        if (a === 'agente' && d === 'general') continue;
        const sa = RANK_INFO[a].strength as number;
        const sd = RANK_INFO[d].strength as number;
        const expected = sa > sd ? 'attacker_wins' : sa < sd ? 'defender_wins' : 'both_removed';
        expect(resolveCombat(a, d), `${a} x ${d}`).toBe(expected);
      }
    }
  });

  it('Agente ataca General: General sai', () => {
    expect(resolveCombat('agente', 'general')).toBe('attacker_wins');
  });

  it('General ataca Agente: Agente sai', () => {
    expect(resolveCombat('general', 'agente')).toBe('attacker_wins');
  });

  it('Agente é força 1 contra as outras peças', () => {
    expect(resolveCombat('agente', 'soldado')).toBe('defender_wins');
    expect(resolveCombat('agente', 'coronel')).toBe('defender_wins');
    expect(resolveCombat('soldado', 'agente')).toBe('attacker_wins');
    expect(resolveCombat('agente', 'agente')).toBe('both_removed');
  });

  it('Mina: atacante sai junto com a Mina, exceto o Cabo', () => {
    for (const a of MOBILE) {
      expect(resolveCombat(a, 'mina')).toBe(a === 'cabo' ? 'attacker_wins' : 'both_removed');
    }
  });

  it('Prisioneiro atacado: atacante vence', () => {
    for (const a of MOBILE) expect(resolveCombat(a, 'prisioneiro')).toBe('attacker_wins');
  });

  it('peças imóveis não atacam', () => {
    expect(() => resolveCombat('mina', 'soldado')).toThrow();
    expect(() => resolveCombat('prisioneiro', 'soldado')).toThrow();
  });
});

/** A ataca B de (4,4) para (4,5). Peças extras garantem que ninguém fique sem jogada. */
function duel(attacker: Rank, defender: Rank) {
  const state = makeState([
    { x: 4, y: 4, owner: 'A', rank: attacker },
    { x: 4, y: 5, owner: 'B', rank: defender },
    { x: 0, y: 0, owner: 'A', rank: 'sargento' },
    { x: 9, y: 9, owner: 'B', rank: 'sargento' },
  ]);
  return applyMove(state, mv(4, 4, 4, 5));
}

describe('combate no tabuleiro', () => {
  it('atacante vence e ocupa a casa; as duas peças ficam reveladas', () => {
    const { state, record } = duel('major', 'capitao');
    const winner = state.board[54];
    expect(winner).toMatchObject({ owner: 'A', rank: 'major', revealed: true, hasMoved: true });
    expect(state.board[44]).toBeNull();
    expect(state.lost.B).toEqual(['capitao']);
    expect(state.lost.A).toEqual([]);
    expect(record.combat).toEqual({
      attackerRank: 'major',
      defenderId: 'B54',
      defenderRank: 'capitao',
      outcome: 'attacker_wins',
    });
    // Revelada continua revelada para o adversário.
    const viewB = getPlayerView(state, 'B');
    expect(viewB.board[54]).toMatchObject({ hidden: false, rank: 'major' });
  });

  it('defensor vence e fica onde está, revelado', () => {
    const { state } = duel('cabo', 'tenente');
    expect(state.board[44]).toBeNull();
    expect(state.board[54]).toMatchObject({
      owner: 'B',
      rank: 'tenente',
      revealed: true,
      hasMoved: false,
    });
    expect(state.lost.A).toEqual(['cabo']);
    expect(getPlayerView(state, 'A').board[54]).toMatchObject({ hidden: false, rank: 'tenente' });
  });

  it('forças iguais: as duas saem', () => {
    const { state, record } = duel('tenente', 'tenente');
    expect(state.board[44]).toBeNull();
    expect(state.board[54]).toBeNull();
    expect(state.lost).toEqual({ A: ['tenente'], B: ['tenente'] });
    expect(record.combat?.outcome).toBe('both_removed');
  });

  it('Agente ataca General: General sai e o Agente ocupa a casa', () => {
    const { state } = duel('agente', 'general');
    expect(state.board[54]).toMatchObject({ owner: 'A', rank: 'agente', revealed: true });
    expect(state.lost.B).toEqual(['general']);
  });

  it('General ataca Agente: Agente sai', () => {
    const { state } = duel('general', 'agente');
    expect(state.board[54]).toMatchObject({ owner: 'A', rank: 'general' });
    expect(state.lost.B).toEqual(['agente']);
  });

  it('Agente defendendo contra o General perde (só vence atacando)', () => {
    const { state } = duel('general', 'agente');
    expect(state.lost.A).toEqual([]);
  });

  it('atacar Mina: atacante e Mina saem', () => {
    const { state } = duel('general', 'mina');
    expect(state.board[44]).toBeNull();
    expect(state.board[54]).toBeNull();
    expect(state.lost).toEqual({ A: ['general'], B: ['mina'] });
  });

  it('Cabo ataca Mina: Mina sai e o Cabo ocupa a casa', () => {
    const { state, record } = duel('cabo', 'mina');
    expect(state.board[54]).toMatchObject({ owner: 'A', rank: 'cabo', revealed: true });
    expect(state.board[44]).toBeNull();
    expect(state.lost).toEqual({ A: [], B: ['mina'] });
    expect(record.combat?.outcome).toBe('attacker_wins');
  });

  it('atacar o Prisioneiro: vitória imediata', () => {
    const { state } = duel('soldado', 'prisioneiro');
    expect(state.phase).toBe('finished');
    expect(state.result).toEqual({ winner: 'A', reason: 'prisoner_rescued' });
    expect(state.turn).toBeNull();
    expect(state.board[54]).toMatchObject({ owner: 'A', rank: 'soldado' });
  });
});
