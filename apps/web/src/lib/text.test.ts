import { describe, expect, it } from 'vitest';
import { rankWithStrength, resultText } from './text';

describe('textos', () => {
  it('patente com força', () => {
    expect(rankWithStrength('major')).toBe('Major (8)');
    expect(rankWithStrength('mina')).toBe('Mina Terrestre');
  });

  it('resultado do ponto de vista do jogador', () => {
    expect(resultText({ winner: 'A', reason: 'prisoner_rescued' }, 'A').title).toBe('Vitória!');
    expect(resultText({ winner: 'A', reason: 'prisoner_rescued' }, 'B')).toEqual({
      title: 'Derrota',
      detail: 'O inimigo resgatou o seu Prisioneiro.',
    });
    expect(resultText({ winner: null, reason: 'no_movable_pieces' }, 'A').title).toBe('Empate');
  });
});
