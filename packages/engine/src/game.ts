import { CELL_COUNT, opponent } from './constants';
import { toIndex, toPos } from './board';
import { resolveCombat } from './combat';
import { EngineError, type MoveErrorCode } from './errors';
import { checkMove, generateMoves, hasMovablePiece, nextRepetition } from './moves';
import { Rng } from './rng';
import { validateSetup, type Placement } from './setup';
import type {
  Cell,
  CombatRecord,
  EndReason,
  GameState,
  Move,
  MoveRecord,
  Piece,
  Player,
  Pos,
  Rank,
} from './types';

export interface CreateGameOptions {
  /** Seed do RNG (sorteio de quem começa etc.). */
  readonly seed: number;
}

export function createGame({ seed }: CreateGameOptions): GameState {
  return {
    phase: 'setup',
    board: Array.from({ length: CELL_COUNT }, () => null),
    ready: { A: false, B: false },
    turn: null,
    firstPlayer: null,
    ply: 0,
    rngState: seed | 0,
    history: [],
    repetition: { A: null, B: null },
    lost: { A: [], B: [] },
    result: null,
  };
}

export function pieceAt(state: GameState, pos: Pos): Cell {
  return state.board[toIndex(pos)] ?? null;
}

/** Confirma o posicionamento de um jogador. Quando os dois confirmam, sorteia quem começa. */
export function submitSetup(
  state: GameState,
  player: Player,
  placements: readonly Placement[],
): GameState {
  if (state.phase !== 'setup') throw new EngineError('not_in_setup');
  if (state.ready[player]) throw new EngineError('already_ready');
  const issues = validateSetup(player, placements);
  const first = issues[0];
  if (first) throw new EngineError(first.code, first.message);

  const board = state.board.slice();
  for (const { pos, rank } of placements) {
    const index = toIndex(pos);
    board[index] = {
      id: `${player}${String(index).padStart(2, '0')}`,
      owner: player,
      rank,
      revealed: false,
      hasMoved: false,
    };
  }
  const ready = { ...state.ready, [player]: true };
  const next: GameState = { ...state, board, ready };
  if (!ready.A || !ready.B) return next;

  const rng = new Rng(state.rngState);
  const starter: Player = rng.next() < 0.5 ? 'A' : 'B';
  return startTurn(
    { ...next, phase: 'playing', firstPlayer: starter, rngState: rng.state },
    starter,
  );
}

/** Valida uma jogada de `player` no estado atual. `null` = legal. */
export function validateMove(state: GameState, player: Player, move: Move): MoveErrorCode | null {
  if (state.phase !== 'playing') return 'game_not_in_progress';
  if (state.turn !== player) return 'not_your_turn';
  return checkMove(state.board, player, state.repetition[player], move);
}

/** Jogadas legais de `player` (vazio se não for a vez dele). */
export function getLegalMoves(state: GameState, player: Player): Move[] {
  if (state.phase !== 'playing' || state.turn !== player) return [];
  return generateMoves(state.board, player, state.repetition[player]);
}

export interface MoveOutcome {
  readonly state: GameState;
  readonly record: MoveRecord;
}

/** Aplica a jogada do jogador da vez. Lança `EngineError` se for ilegal. */
export function applyMove(state: GameState, move: Move): MoveOutcome {
  const player = state.turn;
  if (state.phase !== 'playing' || player === null) {
    throw new EngineError('game_not_in_progress');
  }
  const error = validateMove(state, player, move);
  if (error) throw new EngineError(error);

  const from = toIndex(move.from);
  const to = toIndex(move.to);
  const board = state.board.slice();
  const attacker = board[from] as Piece;
  const defender = board[to] ?? null;
  const distance = Math.abs(move.to.x - move.from.x) + Math.abs(move.to.y - move.from.y);
  // Soldado que anda mais de 1 casa fica revelado.
  const moved: Piece = { ...attacker, hasMoved: true, revealed: attacker.revealed || distance > 1 };

  const lost: Record<Player, Rank[]> = { A: [...state.lost.A], B: [...state.lost.B] };
  let combat: CombatRecord | null = null;
  board[from] = null;

  if (!defender) {
    board[to] = moved;
  } else {
    const outcome = resolveCombat(attacker.rank, defender.rank);
    combat = {
      attackerRank: attacker.rank,
      defenderId: defender.id,
      defenderRank: defender.rank,
      outcome,
    };
    if (outcome === 'attacker_wins') {
      board[to] = { ...moved, revealed: true };
      lost[defender.owner].push(defender.rank);
    } else if (outcome === 'defender_wins') {
      board[to] = { ...defender, revealed: true };
      lost[attacker.owner].push(attacker.rank);
    } else {
      board[to] = null;
      lost[attacker.owner].push(attacker.rank);
      lost[defender.owner].push(defender.rank);
    }
  }

  const record: MoveRecord = {
    ply: state.ply + 1,
    player,
    pieceId: attacker.id,
    from: toPos(from),
    to: toPos(to),
    distance,
    combat,
  };

  const next: GameState = {
    ...state,
    board,
    ply: record.ply,
    history: [...state.history, record],
    repetition: {
      ...state.repetition,
      [player]: nextRepetition(state.repetition[player], attacker.id, from, to, defender !== null),
    },
    lost,
  };

  if (defender?.rank === 'prisioneiro') {
    return { state: finish(next, player, 'prisoner_rescued'), record };
  }

  const aMobile = hasMovablePiece(board, 'A');
  const bMobile = hasMovablePiece(board, 'B');
  if (!aMobile && !bMobile) return { state: finish(next, null, 'no_movable_pieces'), record };
  if (!aMobile) return { state: finish(next, 'B', 'no_movable_pieces'), record };
  if (!bMobile) return { state: finish(next, 'A', 'no_movable_pieces'), record };

  return { state: startTurn(next, opponent(player)), record };
}

export type ForfeitReason = Extract<EndReason, 'resignation' | 'timeout' | 'abandonment'>;

/** Encerra a partida com derrota de `loser` (desistência, timeouts ou abandono). */
export function forfeit(
  state: GameState,
  loser: Player,
  reason: ForfeitReason = 'resignation',
): GameState {
  if (state.phase === 'finished') throw new EngineError('game_already_finished');
  return finish(state, opponent(loser), reason);
}

/** Passa a vez para `player`; se ele não tiver jogada legal, perde. */
function startTurn(state: GameState, player: Player): GameState {
  const moves = generateMoves(state.board, player, state.repetition[player]);
  if (moves.length === 0) return finish(state, opponent(player), 'no_legal_moves');
  return { ...state, turn: player };
}

function finish(state: GameState, winner: Player | null, reason: EndReason): GameState {
  return { ...state, phase: 'finished', turn: null, result: { winner, reason } };
}
