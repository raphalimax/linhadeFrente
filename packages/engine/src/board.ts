import { BOARD_SIZE, LAKES, SETUP_ROWS } from './constants';
import type { Player, Pos } from './types';

export function inBounds(pos: Pos): boolean {
  return (
    Number.isInteger(pos.x) &&
    Number.isInteger(pos.y) &&
    pos.x >= 0 &&
    pos.x < BOARD_SIZE &&
    pos.y >= 0 &&
    pos.y < BOARD_SIZE
  );
}

export function toIndex(pos: Pos): number {
  return pos.y * BOARD_SIZE + pos.x;
}

export function toPos(index: number): Pos {
  return { x: index % BOARD_SIZE, y: Math.floor(index / BOARD_SIZE) };
}

const LAKE_SET: ReadonlySet<number> = new Set(LAKES.map(toIndex));

export function isLake(pos: Pos): boolean {
  return LAKE_SET.has(toIndex(pos));
}

export function isLakeIndex(index: number): boolean {
  return LAKE_SET.has(index);
}

export function isInSetupZone(player: Player, pos: Pos): boolean {
  return inBounds(pos) && SETUP_ROWS[player].includes(pos.y);
}

/** Casas da zona de posicionamento do jogador, em ordem de índice. */
export function setupZone(player: Player): Pos[] {
  const out: Pos[] = [];
  for (const y of SETUP_ROWS[player]) {
    for (let x = 0; x < BOARD_SIZE; x++) out.push({ x, y });
  }
  return out;
}

export function samePos(a: Pos, b: Pos): boolean {
  return a.x === b.x && a.y === b.y;
}

export const DIRECTIONS: readonly Pos[] = [
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: -1, y: 0 },
];
