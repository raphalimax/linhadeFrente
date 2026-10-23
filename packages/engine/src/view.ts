import { RANKS, RANK_INFO } from './constants';
import { checkMove, generateMoves } from './moves';
import type { MoveErrorCode } from './errors';
import type {
  GamePhase,
  GameResult,
  GameState,
  Move,
  MoveRecord,
  Player,
  Rank,
  RepetitionTracker,
} from './types';

/** Peça com patente visível: própria, ou inimiga já revelada. */
export interface VisiblePiece {
  readonly id: string;
  readonly owner: Player;
  readonly hidden: false;
  readonly rank: Rank;
  readonly revealed: boolean;
  readonly hasMoved: boolean;
}

/** Peça inimiga não revelada: só a cor e os metadados públicos. */
export interface HiddenPiece {
  readonly id: string;
  readonly owner: Player;
  readonly hidden: true;
  readonly hasMoved: boolean;
}

export type ViewPiece = VisiblePiece | HiddenPiece;

/**
 * Tudo o que um jogador pode saber. É o que o cliente online recebe e o que a
 * IA recebe — nunca o `GameState`.
 */
export interface PlayerView {
  readonly me: Player;
  readonly phase: GamePhase;
  readonly turn: Player | null;
  readonly firstPlayer: Player | null;
  readonly ply: number;
  readonly ready: Readonly<Record<Player, boolean>>;
  readonly board: readonly (ViewPiece | null)[];
  readonly history: readonly MoveRecord[];
  readonly repetition: Readonly<Record<Player, RepetitionTracker | null>>;
  readonly lost: Readonly<Record<Player, readonly Rank[]>>;
  readonly result: GameResult | null;
}

/**
 * Visão do jogador. Peças inimigas não reveladas viram `{ owner, hidden: true }`.
 * Durante o posicionamento as peças inimigas nem aparecem. Ao fim da partida
 * tudo é revelado.
 */
export function getPlayerView(state: GameState, player: Player): PlayerView {
  const showAll = state.phase === 'finished';
  const board = state.board.map((piece): ViewPiece | null => {
    if (!piece) return null;
    if (piece.owner === player || piece.revealed || showAll) {
      return {
        id: piece.id,
        owner: piece.owner,
        hidden: false,
        rank: piece.rank,
        revealed: piece.revealed,
        hasMoved: piece.hasMoved,
      };
    }
    if (state.phase === 'setup') return null;
    return { id: piece.id, owner: piece.owner, hidden: true, hasMoved: piece.hasMoved };
  });

  return {
    me: player,
    phase: state.phase,
    turn: state.turn,
    firstPlayer: state.firstPlayer,
    ply: state.ply,
    ready: { ...state.ready },
    board,
    history: [...state.history],
    repetition: { ...state.repetition },
    lost: { A: [...state.lost.A], B: [...state.lost.B] },
    result: state.result,
  };
}

/** Jogadas legais do dono da visão (vazio se não for a vez dele). */
export function getLegalMovesForView(view: PlayerView): Move[] {
  if (view.phase !== 'playing' || view.turn !== view.me) return [];
  return generateMoves(view.board, view.me, view.repetition[view.me]);
}

/** Valida uma jogada do dono da visão. `null` = legal. */
export function validateMoveForView(view: PlayerView, move: Move): MoveErrorCode | null {
  if (view.phase !== 'playing') return 'game_not_in_progress';
  if (view.turn !== view.me) return 'not_your_turn';
  return checkMove(view.board, view.me, view.repetition[view.me], move);
}

/** Quantas peças de cada patente ainda restam, dado o que já foi perdido. */
export function remainingCounts(lost: readonly Rank[]): Record<Rank, number> {
  const out = {} as Record<Rank, number>;
  for (const rank of RANKS) out[rank] = RANK_INFO[rank].count;
  for (const rank of lost) out[rank]--;
  return out;
}
