import type { Move, Placement, Player, PlayerView, Rng } from '@ldf/engine';

export type Difficulty = 'recruta' | 'sargento' | 'general';

/**
 * Um bot só enxerga o `PlayerView` — exatamente o que um cliente online recebe.
 * Assim ele não tem como trapacear.
 */
export interface Bot {
  chooseSetup(player: Player, rng: Rng): Placement[];
  chooseMove(view: PlayerView, rng: Rng): Move;
}
