import { ARMY_SIZE, BACK_ROW, RANKS, RANK_INFO, SETUP_ROWS, armyRanks, isRank } from './constants';
import { inBounds, isInSetupZone, setupZone, toIndex } from './board';
import type { SetupErrorCode } from './errors';
import type { Rng } from './rng';
import type { Player, Pos, Rank } from './types';

export interface Placement {
  readonly pos: Pos;
  readonly rank: Rank;
}

export interface SetupIssue {
  readonly code: SetupErrorCode;
  readonly message: string;
}

/** Confere se o posicionamento tem exatamente o exército, dentro da zona do jogador. */
export function validateSetup(player: Player, placements: readonly Placement[]): SetupIssue[] {
  const issues: SetupIssue[] = [];
  if (placements.length !== ARMY_SIZE) {
    issues.push({
      code: 'wrong_piece_count',
      message: `Esperadas ${ARMY_SIZE} peças, recebidas ${placements.length}.`,
    });
  }

  const counts = new Map<Rank, number>();
  const seen = new Set<number>();
  for (const { pos, rank } of placements) {
    if (!isRank(rank)) {
      issues.push({ code: 'unknown_rank', message: `Patente desconhecida: ${String(rank)}.` });
    } else {
      counts.set(rank, (counts.get(rank) ?? 0) + 1);
    }
    if (!isInSetupZone(player, pos)) {
      issues.push({
        code: 'out_of_zone',
        message: `Casa (${pos.x},${pos.y}) fora da zona do jogador ${player}.`,
      });
    } else {
      const index = toIndex(pos);
      if (seen.has(index)) {
        issues.push({ code: 'duplicate_cell', message: `Casa (${pos.x},${pos.y}) repetida.` });
      }
      seen.add(index);
    }
  }

  for (const rank of RANKS) {
    const got = counts.get(rank) ?? 0;
    const expected = RANK_INFO[rank].count;
    if (got !== expected) {
      issues.push({
        code: 'wrong_rank_count',
        message: `${RANK_INFO[rank].label}: esperado ${expected}, recebido ${got}.`,
      });
    }
  }
  return issues;
}

/** Posicionamento totalmente aleatório. */
export function randomSetup(player: Player, rng: Rng): Placement[] {
  const cells = rng.shuffle(setupZone(player));
  return armyRanks().map((rank, i) => ({ pos: cells[i] as Pos, rank }));
}

/**
 * Aleatório "inteligente": Prisioneiro na fileira do fundo, cercado de Minas
 * (nas casas vizinhas da zona); as Minas que sobram ficam longe da linha de
 * frente; o resto é aleatório.
 */
export function smartRandomSetup(player: Player, rng: Rng): Placement[] {
  const backRow = BACK_ROW[player];
  const forward = player === 'A' ? 1 : -1;
  const rows = SETUP_ROWS[player];
  const frontRow = player === 'A' ? Math.max(...rows) : Math.min(...rows);

  const taken = new Set<number>();
  const out: Placement[] = [];
  const place = (pos: Pos, rank: Rank) => {
    taken.add(toIndex(pos));
    out.push({ pos, rank });
  };

  const prisoner = { x: rng.int(10), y: backRow };
  place(prisoner, 'prisioneiro');

  let mines = RANK_INFO.mina.count;
  const guards = [
    { x: prisoner.x - 1, y: backRow },
    { x: prisoner.x + 1, y: backRow },
    { x: prisoner.x, y: backRow + forward },
  ].filter(inBounds);
  for (const pos of guards) {
    place(pos, 'mina');
    mines--;
  }

  const rearCells = rng.shuffle(
    setupZone(player).filter((p) => p.y !== frontRow && !taken.has(toIndex(p))),
  );
  for (let i = 0; i < mines; i++) place(rearCells[i] as Pos, 'mina');

  const rest = armyRanks().filter((r) => r !== 'mina' && r !== 'prisioneiro');
  const free = rng.shuffle(setupZone(player).filter((p) => !taken.has(toIndex(p))));
  rest.forEach((rank, i) => place(free[i] as Pos, rank));
  return out;
}
