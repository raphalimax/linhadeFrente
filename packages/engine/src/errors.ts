export type MoveErrorCode =
  | 'game_not_in_progress'
  | 'not_your_turn'
  | 'out_of_bounds'
  | 'no_piece'
  | 'not_your_piece'
  | 'immobile_piece'
  | 'not_orthogonal'
  | 'lake'
  | 'own_piece'
  | 'too_far'
  | 'path_blocked'
  | 'soldier_cannot_attack_after_running'
  | 'repetition_limit';

export type SetupErrorCode =
  | 'not_in_setup'
  | 'already_ready'
  | 'wrong_piece_count'
  | 'unknown_rank'
  | 'wrong_rank_count'
  | 'out_of_zone'
  | 'duplicate_cell';

export type GameErrorCode = 'game_already_finished';

export type EngineErrorCode = MoveErrorCode | SetupErrorCode | GameErrorCode;

export class EngineError extends Error {
  constructor(
    readonly code: EngineErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = 'EngineError';
  }
}
