import { isRank, type Placement, type Player, type Rank } from '@ldf/engine';

/**
 * Formação salva, independente do lado: `row` 0 é a fileira do fundo e `col`
 * é contado da esquerda do próprio jogador. Assim a mesma formação serve para
 * jogar de vermelho ou de azul.
 */
export interface Formation {
  readonly name: string;
  readonly cells: readonly { col: number; row: number; rank: Rank }[];
}

const KEY = 'ldf:formacoes';

export function toFormation(
  name: string,
  player: Player,
  placements: readonly Placement[],
): Formation {
  return {
    name,
    cells: placements.map(({ pos, rank }) =>
      player === 'A' ? { col: pos.x, row: pos.y, rank } : { col: 9 - pos.x, row: 9 - pos.y, rank },
    ),
  };
}

export function fromFormation(formation: Formation, player: Player): Placement[] {
  return formation.cells.map(({ col, row, rank }) => ({
    pos: player === 'A' ? { x: col, y: row } : { x: 9 - col, y: 9 - row },
    rank,
  }));
}

function isFormation(value: unknown): value is Formation {
  if (typeof value !== 'object' || value === null) return false;
  const f = value as Formation;
  return (
    typeof f.name === 'string' &&
    Array.isArray(f.cells) &&
    f.cells.every((c) => Number.isInteger(c?.col) && Number.isInteger(c?.row) && isRank(c?.rank))
  );
}

export function loadFormations(storage: Storage | undefined): Formation[] {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isFormation) : [];
  } catch {
    return [];
  }
}

function store(storage: Storage | undefined, list: Formation[]): Formation[] {
  try {
    storage?.setItem(KEY, JSON.stringify(list));
  } catch {
    // Armazenamento indisponível (aba anônima etc.): segue só em memória.
  }
  return list;
}

/** Salva (substituindo outra com o mesmo nome) e devolve a lista atualizada. */
export function saveFormation(storage: Storage | undefined, formation: Formation): Formation[] {
  const list = loadFormations(storage).filter((f) => f.name !== formation.name);
  return store(storage, [...list, formation]);
}

export function deleteFormation(storage: Storage | undefined, name: string): Formation[] {
  return store(
    storage,
    loadFormations(storage).filter((f) => f.name !== name),
  );
}
