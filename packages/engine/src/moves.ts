import { BOARD_SIZE, CELL_COUNT, MAX_BACK_AND_FORTH, RANK_INFO } from './constants';
import { DIRECTIONS, inBounds, isLakeIndex, toIndex, toPos } from './board';
import type { MoveErrorCode } from './errors';
import type { Move, Player, Rank, RepetitionTracker } from './types';

/**
 * O mínimo que a geração de jogadas precisa saber de uma casa. Serve tanto
 * para o `GameState` (todas as patentes) quanto para o `PlayerView` (peças
 * inimigas sem patente), assim a IA e o cliente usam exatamente o mesmo código.
 */
export interface BoardPiece {
  readonly id: string;
  readonly owner: Player;
  readonly rank?: Rank;
}

export type BoardLike = readonly (BoardPiece | null)[];

function isMovable(piece: BoardPiece): boolean {
  return piece.rank !== undefined && RANK_INFO[piece.rank].movable;
}

function sameSquares(tracker: RepetitionTracker, from: number, to: number): boolean {
  return (tracker.a === from && tracker.b === to) || (tracker.a === to && tracker.b === from);
}

/** A jogada seria o 4º vai-e-volta seguido entre as mesmas duas casas? */
export function violatesRepetition(
  tracker: RepetitionTracker | null,
  pieceId: string,
  from: number,
  to: number,
): boolean {
  return (
    tracker !== null &&
    tracker.pieceId === pieceId &&
    sameSquares(tracker, from, to) &&
    tracker.count >= MAX_BACK_AND_FORTH
  );
}

/**
 * Atualiza o contador de vai-e-volta após uma jogada do jogador. Ataques não
 * contam como vai-e-volta e zeram o contador.
 */
export function nextRepetition(
  tracker: RepetitionTracker | null,
  pieceId: string,
  from: number,
  to: number,
  isAttack: boolean,
): RepetitionTracker | null {
  if (isAttack) return null;
  if (tracker !== null && tracker.pieceId === pieceId && sameSquares(tracker, from, to)) {
    return { ...tracker, count: tracker.count + 1 };
  }
  return { pieceId, a: from, b: to, count: 1 };
}

/** Jogadas legais da peça na casa `from` (índice). */
export function pieceMoves(
  board: BoardLike,
  from: number,
  tracker: RepetitionTracker | null,
): Move[] {
  const piece = board[from];
  if (!piece || !isMovable(piece)) return [];
  const maxSteps = piece.rank === 'soldado' ? BOARD_SIZE : 1;
  const origin = toPos(from);
  const out: Move[] = [];

  for (const dir of DIRECTIONS) {
    for (let step = 1; step <= maxSteps; step++) {
      const target = { x: origin.x + dir.x * step, y: origin.y + dir.y * step };
      if (!inBounds(target)) break;
      const to = toIndex(target);
      if (isLakeIndex(to)) break;
      const occupant = board[to];
      if (occupant) {
        // Ataque só é possível andando 1 casa.
        if (occupant.owner !== piece.owner && step === 1) out.push({ from: origin, to: target });
        break;
      }
      if (!violatesRepetition(tracker, piece.id, from, to)) {
        out.push({ from: origin, to: target });
      }
    }
  }
  return out;
}

/** Todas as jogadas legais de `player` no tabuleiro. */
export function generateMoves(
  board: BoardLike,
  player: Player,
  tracker: RepetitionTracker | null,
): Move[] {
  const out: Move[] = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    if (board[i]?.owner === player) out.push(...pieceMoves(board, i, tracker));
  }
  return out;
}

/** `player` tem alguma peça móvel no tabuleiro? */
export function hasMovablePiece(board: BoardLike, player: Player): boolean {
  return board.some((p) => p !== null && p.owner === player && isMovable(p));
}

/**
 * Valida uma jogada no tabuleiro (sem checar fase/turno). Devolve `null` se for
 * legal ou o código do motivo.
 */
export function checkMove(
  board: BoardLike,
  player: Player,
  tracker: RepetitionTracker | null,
  move: Move,
): MoveErrorCode | null {
  const { from, to } = move;
  if (!inBounds(from) || !inBounds(to)) return 'out_of_bounds';
  const fromIndex = toIndex(from);
  const piece = board[fromIndex];
  if (!piece) return 'no_piece';
  if (piece.owner !== player) return 'not_your_piece';
  if (!isMovable(piece)) return 'immobile_piece';

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if ((dx !== 0) === (dy !== 0)) return 'not_orthogonal'; // diagonal ou parado
  const toIndexValue = toIndex(to);
  if (isLakeIndex(toIndexValue)) return 'lake';
  const target = board[toIndexValue];
  if (target && target.owner === player) return 'own_piece';

  const distance = Math.abs(dx) + Math.abs(dy);
  if (distance > 1) {
    if (piece.rank !== 'soldado') return 'too_far';
    const sx = Math.sign(dx);
    const sy = Math.sign(dy);
    for (let step = 1; step < distance; step++) {
      const mid = toIndex({ x: from.x + sx * step, y: from.y + sy * step });
      if (isLakeIndex(mid) || board[mid]) return 'path_blocked';
    }
    if (target) return 'soldier_cannot_attack_after_running';
  }

  if (!target && violatesRepetition(tracker, piece.id, fromIndex, toIndexValue)) {
    return 'repetition_limit';
  }
  return null;
}
