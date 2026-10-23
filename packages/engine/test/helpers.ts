import {
  applyMove,
  createGame,
  forfeit,
  getLegalMoves,
  randomSetup,
  Rng,
  smartRandomSetup,
  submitSetup,
  toIndex,
  type Cell,
  type GameState,
  type Move,
  type Player,
  type Rank,
} from '../src';

export interface PieceSpec {
  x: number;
  y: number;
  owner: Player;
  rank: Rank;
  revealed?: boolean;
  hasMoved?: boolean;
  id?: string;
}

/** Monta um estado em jogo com só as peças informadas. */
export function makeState(pieces: PieceSpec[], turn: Player = 'A'): GameState {
  const board: Cell[] = Array.from({ length: 100 }, () => null);
  for (const p of pieces) {
    const index = toIndex(p);
    board[index] = {
      id: p.id ?? `${p.owner}${String(index).padStart(2, '0')}`,
      owner: p.owner,
      rank: p.rank,
      revealed: p.revealed ?? false,
      hasMoved: p.hasMoved ?? false,
    };
  }
  return {
    ...createGame({ seed: 1 }),
    phase: 'playing',
    ready: { A: true, B: true },
    turn,
    firstPlayer: turn,
    board,
  };
}

export const mv = (fx: number, fy: number, tx: number, ty: number): Move => ({
  from: { x: fx, y: fy },
  to: { x: tx, y: ty },
});

/** Aplica uma sequência de jogadas, devolvendo o estado final. */
export function play(state: GameState, ...moves: Move[]): GameState {
  return moves.reduce((s, m) => applyMove(s, m).state, state);
}

/** Partida com posicionamento aleatório (inteligente) para os dois. */
export function startedGame(seed: number, smart = true): GameState {
  const rng = new Rng(seed);
  const setup = smart ? smartRandomSetup : randomSetup;
  let state = createGame({ seed });
  state = submitSetup(state, 'A', setup('A', rng));
  state = submitSetup(state, 'B', setup('B', rng));
  return state;
}

/** Joga aleatoriamente até o fim (ou até `maxPlies`), chamando `onState` a cada estado. */
export function playRandomGame(
  seed: number,
  onState: (state: GameState) => void = () => {},
  maxPlies = 4000,
): GameState {
  const rng = new Rng(seed ^ 0x5eed);
  let state = startedGame(seed, seed % 2 === 0);
  onState(state);
  while (state.phase === 'playing' && state.ply < maxPlies) {
    const moves = getLegalMoves(state, state.turn as Player);
    state = applyMove(state, rng.pick(moves)).state;
    onState(state);
  }
  if (state.phase === 'playing') state = forfeit(state, state.turn as Player, 'resignation');
  return state;
}

export function moveKey(m: Move): string {
  return `${m.from.x},${m.from.y}>${m.to.x},${m.to.y}`;
}
