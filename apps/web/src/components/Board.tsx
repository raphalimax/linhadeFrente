import { BOARD_SIZE, isLakeIndex, toIndex, type Player, type Rank } from '@ldf/engine';
import { PieceTile } from './PieceTile';

export interface BoardCell {
  owner: Player;
  rank?: Rank;
  revealed?: boolean;
}

interface BoardProps {
  cells: readonly (BoardCell | null)[];
  /** De que lado o jogador olha: o exército dele fica embaixo. */
  me: Player;
  selected?: number | null;
  targets?: ReadonlySet<number>;
  /** Casas destacadas (ex.: zona de posicionamento). */
  zone?: ReadonlySet<number>;
  lastMove?: { from: number; to: number } | null;
  onCellClick?: (index: number) => void;
}

/** Índices na ordem de exibição (linha de cima → de baixo, esquerda → direita). */
function displayOrder(me: Player): number[] {
  const out: number[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      out.push(
        me === 'A'
          ? toIndex({ x: col, y: BOARD_SIZE - 1 - row })
          : toIndex({ x: BOARD_SIZE - 1 - col, y: row }),
      );
    }
  }
  return out;
}

const ORDER = { A: displayOrder('A'), B: displayOrder('B') };

export function Board({ cells, me, selected, targets, zone, lastMove, onCellClick }: BoardProps) {
  return (
    <div className="board-size board-frame shadow-[0_6px_0_rgba(0,0,0,0.4)]">
      <div
        className="grid h-full w-full grid-cols-10 border-2 border-black/60"
        role="grid"
        aria-label="Tabuleiro"
      >
        {ORDER[me].map((index) => {
          const lake = isLakeIndex(index);
          const piece = cells[index];
          const x = index % BOARD_SIZE;
          const y = Math.floor(index / BOARD_SIZE);
          const isTarget = targets?.has(index) ?? false;
          const isSelected = selected === index;
          const isLast = lastMove && (lastMove.from === index || lastMove.to === index);
          const ground = lake ? 'tile-lago' : (x + y) % 2 ? 'tile-grama' : 'tile-grama2';
          return (
            <button
              key={index}
              type="button"
              role="gridcell"
              disabled={lake || !onCellClick}
              onClick={() => onCellClick?.(index)}
              aria-label={`casa ${x},${y}${piece ? ` ${piece.rank ?? 'oculta'}` : ''}`}
              className={`relative aspect-square ${ground} ${zone?.has(index) ? 'brightness-110' : ''} outline-none`}
            >
              {isLast && <span className="absolute inset-0 bg-yellow-200/25" />}
              {piece && (
                <div className="absolute inset-[6%]">
                  <PieceTile owner={piece.owner} rank={piece.rank} revealed={piece.revealed} />
                </div>
              )}
              {isTarget && (
                <span
                  className={`pointer-events-none absolute ${piece ? 'inset-0 border-4 border-red-400' : 'inset-[35%] bg-yellow-300/80'}`}
                />
              )}
              {isSelected && (
                <span className="pointer-events-none absolute inset-0 border-4 border-yellow-300" />
              )}
              {zone?.has(index) && !piece && (
                <span className="pointer-events-none absolute inset-0 border border-dashed border-white/30" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
