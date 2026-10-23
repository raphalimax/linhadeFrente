export type Player = 'A' | 'B';

/** Identificadores das patentes. Coincidem com os nomes dos sprites. */
export type Rank =
  | 'agente'
  | 'soldado'
  | 'cabo'
  | 'sargento'
  | 'subtenente'
  | 'tenente'
  | 'capitao'
  | 'major'
  | 'coronel'
  | 'general'
  | 'prisioneiro'
  | 'mina';

export interface Pos {
  readonly x: number;
  readonly y: number;
}

export interface Move {
  readonly from: Pos;
  readonly to: Pos;
}

export interface Piece {
  /** Id opaco, derivado da casa inicial; não revela a patente. */
  readonly id: string;
  readonly owner: Player;
  readonly rank: Rank;
  /** Revelada publicamente (combate ou Soldado que andou mais de 1 casa). */
  readonly revealed: boolean;
  /** Já se moveu alguma vez (informação pública). */
  readonly hasMoved: boolean;
}

export type Cell = Piece | null;

export type GamePhase = 'setup' | 'playing' | 'finished';

export type EndReason =
  | 'prisoner_rescued'
  | 'no_movable_pieces'
  | 'no_legal_moves'
  | 'resignation'
  | 'timeout'
  | 'abandonment';

export interface GameResult {
  /** `null` = empate. */
  readonly winner: Player | null;
  readonly reason: EndReason;
}

export type CombatOutcome = 'attacker_wins' | 'defender_wins' | 'both_removed';

export interface CombatRecord {
  readonly attackerRank: Rank;
  readonly defenderId: string;
  readonly defenderRank: Rank;
  readonly outcome: CombatOutcome;
}

/** Registro público de uma jogada (tudo aqui é conhecido pelos dois jogadores). */
export interface MoveRecord {
  readonly ply: number;
  readonly player: Player;
  readonly pieceId: string;
  readonly from: Pos;
  readonly to: Pos;
  readonly distance: number;
  readonly combat: CombatRecord | null;
}

/**
 * Sequência atual de vai-e-volta de um jogador. `a` e `b` são índices de casa.
 * `count` é quantas jogadas seguidas a peça fez entre essas duas casas.
 */
export interface RepetitionTracker {
  readonly pieceId: string;
  readonly a: number;
  readonly b: number;
  readonly count: number;
}

export interface GameState {
  readonly phase: GamePhase;
  /** 100 casas, índice `y * 10 + x`. */
  readonly board: readonly Cell[];
  /** Quem já confirmou o posicionamento. */
  readonly ready: Readonly<Record<Player, boolean>>;
  /** De quem é a vez (`null` durante o posicionamento e após o fim). */
  readonly turn: Player | null;
  /** Quem começou a partida (sorteado). */
  readonly firstPlayer: Player | null;
  /** Número de jogadas já feitas. */
  readonly ply: number;
  /** Estado do RNG com seed. Nunca enviado aos clientes. */
  readonly rngState: number;
  readonly history: readonly MoveRecord[];
  readonly repetition: Readonly<Record<Player, RepetitionTracker | null>>;
  /** Patentes perdidas por cada jogador (público). */
  readonly lost: Readonly<Record<Player, readonly Rank[]>>;
  readonly result: GameResult | null;
}
