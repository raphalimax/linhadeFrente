import {
  RANKS,
  RANK_INFO,
  isInSetupZone,
  toIndex,
  toPos,
  type Placement,
  type Player,
  type Rank,
} from '@ldf/engine';

/** Posicionamento em edição: índice da casa → patente. */
export type Draft = Readonly<Record<number, Rank>>;

export const emptyDraft: Draft = {};

export function draftFromPlacements(placements: readonly Placement[]): Draft {
  const out: Record<number, Rank> = {};
  for (const { pos, rank } of placements) out[toIndex(pos)] = rank;
  return out;
}

export function draftToPlacements(draft: Draft): Placement[] {
  return Object.entries(draft).map(([index, rank]) => ({ pos: toPos(Number(index)), rank }));
}

export function draftSize(draft: Draft): number {
  return Object.keys(draft).length;
}

/** Quantas peças de cada patente ainda faltam colocar. */
export function remainingToPlace(draft: Draft): Record<Rank, number> {
  const out = {} as Record<Rank, number>;
  for (const rank of RANKS) out[rank] = RANK_INFO[rank].count;
  for (const rank of Object.values(draft)) out[rank]--;
  return out;
}

/** Primeira patente (em ordem canônica) que ainda tem peças para colocar. */
export function nextRankToPlace(draft: Draft, preferred?: Rank): Rank | null {
  const remaining = remainingToPlace(draft);
  if (preferred && remaining[preferred] > 0) return preferred;
  return RANKS.find((r) => remaining[r] > 0) ?? null;
}

/**
 * Coloca uma peça da bandeja na casa. Se a casa estava ocupada, a peça antiga
 * volta para a bandeja. Ignora casas fora da zona e patentes esgotadas.
 */
export function placeRank(draft: Draft, player: Player, index: number, rank: Rank): Draft {
  if (!isInSetupZone(player, toPos(index))) return draft;
  if (remainingToPlace(draft)[rank] <= 0) return draft;
  return { ...draft, [index]: rank };
}

/** Move uma peça já colocada; se o destino estiver ocupado, troca as duas. */
export function movePlaced(draft: Draft, player: Player, from: number, to: number): Draft {
  const rank = draft[from];
  if (rank === undefined || from === to || !isInSetupZone(player, toPos(to))) return draft;
  const next: Record<number, Rank> = { ...draft, [to]: rank };
  const other = draft[to];
  if (other === undefined) delete next[from];
  else next[from] = other;
  return next;
}

export function removePlaced(draft: Draft, index: number): Draft {
  if (draft[index] === undefined) return draft;
  const next: Record<number, Rank> = { ...draft };
  delete next[index];
  return next;
}

export function isDraftComplete(draft: Draft): boolean {
  return Object.values(remainingToPlace(draft)).every((n) => n === 0);
}
