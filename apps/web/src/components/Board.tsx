'use client';

import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';
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
  /** Anima a peça que chegou em `to` deslizando a partir de `from`. */
  slide?: { from: number; to: number; key: number } | null;
  onCellClick?: (index: number) => void;
  /** Peças que podem ser arrastadas com o mouse. */
  canDrag?: (index: number) => boolean;
  onDrop?: (from: number, to: number) => void;
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
/** Posição na tela (coluna, linha) de cada índice. */
const SCREEN = {
  A: screenPositions(ORDER.A),
  B: screenPositions(ORDER.B),
};

function screenPositions(order: number[]): { col: number; row: number }[] {
  const out: { col: number; row: number }[] = [];
  order.forEach((index, i) => {
    out[index] = { col: i % BOARD_SIZE, row: Math.floor(i / BOARD_SIZE) };
  });
  return out;
}

/** A peça ocupa 88% da casa (inset 6%), então 1 casa = 100/0.88 % da peça. */
const CELL_IN_PIECE = 100 / 0.88;
const DRAG_THRESHOLD_PX = 6;

interface DragState {
  from: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  active: boolean;
  /** Lado da casa em px (tamanho do fantasma). */
  size: number;
}

export function Board({
  cells,
  me,
  selected,
  targets,
  zone,
  lastMove,
  slide,
  onCellClick,
  canDrag,
  onDrop,
}: BoardProps) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const suppressClick = useRef(false);

  function cellFromPoint(x: number, y: number): number | null {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-cell]');
    return el ? Number(el.dataset.cell) : null;
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    // Toque usa "tocar e tocar"; arrastar é para o mouse.
    if (e.pointerType !== 'mouse' || e.button !== 0 || !onDrop || !canDrag) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-cell]');
    const index = el ? Number(el.dataset.cell) : null;
    if (index === null || !canDrag(index)) return;
    const size = el!.getBoundingClientRect().width;
    setDrag({
      from: index,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      active: false,
      size,
    });
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const moved =
      Math.abs(e.clientX - drag.startX) + Math.abs(e.clientY - drag.startY) > DRAG_THRESHOLD_PX;
    if (!drag.active && moved) {
      e.currentTarget.setPointerCapture(e.pointerId);
      onCellClick?.(drag.from); // seleciona e mostra os destinos
    }
    setDrag({ ...drag, x: e.clientX, y: e.clientY, active: drag.active || moved });
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    if (drag.active) {
      suppressClick.current = true;
      const to = cellFromPoint(e.clientX, e.clientY);
      if (to !== null && to !== drag.from) onDrop?.(drag.from, to);
    }
    setDrag(null);
  }

  const dragging = drag?.active ? drag : null;
  const dragPiece = dragging ? cells[dragging.from] : null;

  return (
    <div className="board-size board-frame shadow-[0_6px_0_rgba(0,0,0,0.4)] select-none">
      <div
        className="grid h-full w-full grid-cols-10 border-2 border-black/60"
        role="grid"
        aria-label="Tabuleiro"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
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
          const sliding = slide && slide.to === index && piece;
          let slideStyle: CSSProperties | undefined;
          if (sliding) {
            const a = SCREEN[me][slide.from]!;
            const b = SCREEN[me][slide.to]!;
            slideStyle = {
              '--dx': `${(a.col - b.col) * CELL_IN_PIECE}%`,
              '--dy': `${(a.row - b.row) * CELL_IN_PIECE}%`,
            } as CSSProperties;
          }
          return (
            <button
              key={index}
              type="button"
              role="gridcell"
              data-cell={index}
              disabled={lake || !onCellClick}
              onClick={() => {
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                onCellClick?.(index);
              }}
              aria-label={`casa ${x},${y}${piece ? ` ${piece.rank ?? 'oculta'}` : ''}`}
              className={`relative aspect-square ${ground} ${zone?.has(index) ? 'brightness-110' : ''} outline-none`}
            >
              {isLast && <span className="absolute inset-0 bg-yellow-200/25" />}
              {piece && (
                <div
                  key={sliding ? `slide-${slide.key}` : 'still'}
                  className={`absolute inset-[6%] ${sliding ? 'piece-slide' : ''} ${dragging?.from === index ? 'opacity-30' : ''} ${isSelected ? 'piece-lift' : ''}`}
                  style={slideStyle}
                >
                  <PieceTile owner={piece.owner} rank={piece.rank} revealed={piece.revealed} />
                </div>
              )}
              {isTarget && (
                <span
                  className={`pointer-events-none absolute ${piece ? 'target-attack inset-0 border-4 border-red-400' : 'target-dot inset-[35%] bg-yellow-300/80'}`}
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
      {dragging && dragPiece && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_6px_4px_rgba(0,0,0,0.5)]"
          style={{ left: dragging.x, top: dragging.y, width: dragging.size, height: dragging.size }}
        >
          <PieceTile owner={dragPiece.owner} rank={dragPiece.rank} revealed={dragPiece.revealed} />
        </div>
      )}
    </div>
  );
}
