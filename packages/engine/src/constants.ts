import type { Player, Pos, Rank } from './types';

export const BOARD_SIZE = 10;
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
export const ARMY_SIZE = 40;

export const PLAYERS: readonly Player[] = ['A', 'B'];

export function opponent(player: Player): Player {
  return player === 'A' ? 'B' : 'A';
}

export interface RankInfo {
  /** Força usada no combate. `null` para peças que não atacam (Mina, Prisioneiro). */
  readonly strength: number | null;
  /** Quantidade no exército inicial. */
  readonly count: number;
  readonly movable: boolean;
  /** Nome em português para a UI. */
  readonly label: string;
}

/** Ordem canônica das patentes (mais fraca → mais forte, depois as imóveis). */
export const RANKS: readonly Rank[] = [
  'agente',
  'soldado',
  'cabo',
  'sargento',
  'subtenente',
  'tenente',
  'capitao',
  'major',
  'coronel',
  'general',
  'prisioneiro',
  'mina',
];

export const RANK_INFO: Readonly<Record<Rank, RankInfo>> = {
  agente: { strength: 1, count: 1, movable: true, label: 'Agente Secreto' },
  soldado: { strength: 2, count: 8, movable: true, label: 'Soldado' },
  cabo: { strength: 3, count: 5, movable: true, label: 'Cabo' },
  sargento: { strength: 4, count: 4, movable: true, label: 'Sargento' },
  subtenente: { strength: 5, count: 4, movable: true, label: 'Subtenente' },
  tenente: { strength: 6, count: 4, movable: true, label: 'Tenente' },
  capitao: { strength: 7, count: 3, movable: true, label: 'Capitão' },
  major: { strength: 8, count: 2, movable: true, label: 'Major' },
  coronel: { strength: 9, count: 1, movable: true, label: 'Coronel' },
  general: { strength: 10, count: 1, movable: true, label: 'General' },
  prisioneiro: { strength: null, count: 1, movable: false, label: 'Prisioneiro' },
  mina: { strength: null, count: 6, movable: false, label: 'Mina Terrestre' },
};

export function isRank(value: unknown): value is Rank {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(RANK_INFO, value);
}

/** Lista com as 40 patentes do exército (com repetição), em ordem canônica. */
export function armyRanks(): Rank[] {
  const out: Rank[] = [];
  for (const rank of RANKS) {
    for (let i = 0; i < RANK_INFO[rank].count; i++) out.push(rank);
  }
  return out;
}

export const LAKES: readonly Pos[] = [
  { x: 2, y: 4 },
  { x: 3, y: 4 },
  { x: 2, y: 5 },
  { x: 3, y: 5 },
  { x: 6, y: 4 },
  { x: 7, y: 4 },
  { x: 6, y: 5 },
  { x: 7, y: 5 },
];

/** Fileiras de posicionamento de cada jogador. */
export const SETUP_ROWS: Readonly<Record<Player, readonly number[]>> = {
  A: [0, 1, 2, 3],
  B: [6, 7, 8, 9],
};

/** Fileira do fundo (mais longe do inimigo) de cada jogador. */
export const BACK_ROW: Readonly<Record<Player, number>> = { A: 0, B: 9 };

/** Quantas jogadas seguidas de vai-e-volta entre as mesmas duas casas são permitidas. */
export const MAX_BACK_AND_FORTH = 3;
