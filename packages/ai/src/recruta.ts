import {
  DIRECTIONS,
  RANK_INFO,
  getLegalMovesForView,
  inBounds,
  resolveCombat,
  smartRandomSetup,
  toIndex,
  type Move,
  type Placement,
  type Player,
  type PlayerView,
  type Rank,
  type Rng,
  type ViewPiece,
} from '@ldf/engine';
import type { Bot } from './types';

/** Peso de cada jogada; a Recruta sorteia proporcionalmente. */
export function recrutaWeight(view: PlayerView, move: Move): number {
  const mine = view.board[toIndex(move.from)];
  /* v8 ignore next */
  if (!mine || mine.hidden) return 0; // nunca acontece com jogadas legais
  const target = view.board[toIndex(move.to)];

  if (target) {
    if (target.hidden) {
      // Peça parada pode ser Mina: as peças valiosas evitam atacá-la às cegas.
      const valuable = (RANK_INFO[mine.rank].strength as number) >= 8;
      return !target.hasMoved && valuable ? 0.5 : 1.5;
    }
    const outcome = resolveCombat(mine.rank, target.rank);
    if (outcome === 'attacker_wins') return 8;
    if (outcome === 'both_removed') return 1;
    return 0.1;
  }

  // Evita parar ao lado de uma peça revelada que a venceria.
  return threatenedBy(view, move.to, mine.rank, mine.owner) ? 0.3 : 1;
}

function threatenedBy(
  view: PlayerView,
  pos: { x: number; y: number },
  rank: Rank,
  owner: Player,
): boolean {
  return DIRECTIONS.some((d) => {
    const n = { x: pos.x + d.x, y: pos.y + d.y };
    if (!inBounds(n)) return false;
    const enemy: ViewPiece | null | undefined = view.board[toIndex(n)];
    if (!enemy || enemy.owner === owner || enemy.hidden) return false;
    if (!RANK_INFO[enemy.rank].movable) return false;
    return resolveCombat(enemy.rank, rank) === 'attacker_wins';
  });
}

/** Nível fácil: jogada legal aleatória, com leve preferência por bons ataques. */
export const recruta: Bot = {
  chooseSetup(player: Player, rng: Rng): Placement[] {
    return smartRandomSetup(player, rng);
  },

  chooseMove(view: PlayerView, rng: Rng): Move {
    const moves = getLegalMovesForView(view);
    if (moves.length === 0) throw new Error('Sem jogadas legais');
    const weights = moves.map((m) => recrutaWeight(view, m));
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = rng.next() * total;
    for (let i = 0; i < moves.length - 1; i++) {
      roll -= weights[i] as number;
      if (roll < 0) return moves[i] as Move;
    }
    return moves[moves.length - 1] as Move;
  },
};
