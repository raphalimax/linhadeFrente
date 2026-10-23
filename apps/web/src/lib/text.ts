import { RANK_INFO, type EndReason, type GameResult, type Player, type Rank } from '@ldf/engine';

export function rankLabel(rank: Rank): string {
  return RANK_INFO[rank].label;
}

/** Ex.: "Major (8)", "Mina Terrestre". */
export function rankWithStrength(rank: Rank): string {
  const s = RANK_INFO[rank].strength;
  return s === null ? rankLabel(rank) : `${rankLabel(rank)} (${s})`;
}

const REASONS: Record<EndReason, { win: string; lose: string; draw: string }> = {
  prisoner_rescued: {
    win: 'Você resgatou o Prisioneiro inimigo.',
    lose: 'O inimigo resgatou o seu Prisioneiro.',
    draw: '',
  },
  no_movable_pieces: {
    win: 'O inimigo ficou sem peças que se movem.',
    lose: 'Você ficou sem peças que se movem.',
    draw: 'Os dois exércitos ficaram sem peças que se movem.',
  },
  no_legal_moves: {
    win: 'O inimigo ficou sem jogadas possíveis.',
    lose: 'Você ficou sem jogadas possíveis.',
    draw: '',
  },
  resignation: { win: 'O inimigo desistiu.', lose: 'Você desistiu.', draw: '' },
  timeout: { win: 'O inimigo estourou o tempo.', lose: 'Você estourou o tempo.', draw: '' },
  abandonment: {
    win: 'O inimigo abandonou a partida.',
    lose: 'Você abandonou a partida.',
    draw: '',
  },
};

export function resultText(result: GameResult, me: Player): { title: string; detail: string } {
  if (result.winner === null) return { title: 'Empate', detail: REASONS[result.reason].draw };
  const won = result.winner === me;
  return {
    title: won ? 'Vitória!' : 'Derrota',
    detail: won ? REASONS[result.reason].win : REASONS[result.reason].lose,
  };
}
