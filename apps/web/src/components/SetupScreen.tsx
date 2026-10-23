'use client';

import { useMemo, useState } from 'react';
import { RANKS, randomSetup, setupZone, smartRandomSetup, toIndex, type Rank } from '@ldf/engine';
import { Board, type BoardCell } from './Board';
import { PieceTile } from './PieceTile';
import { FormationsPanel } from './FormationsPanel';
import { freshRng, HUMAN, useGameStore } from '@/store/game';
import { rankWithStrength } from '@/lib/text';
import {
  draftFromPlacements,
  draftSize,
  emptyDraft,
  isDraftComplete,
  movePlaced,
  nextRankToPlace,
  placeRank,
  remainingToPlace,
  removePlaced,
} from '@/lib/setupDraft';

const ZONE = new Set(setupZone(HUMAN).map(toIndex));

export function SetupScreen() {
  const draft = useGameStore((s) => s.draft);
  const setDraft = useGameStore((s) => s.setDraft);
  const confirmSetup = useGameStore((s) => s.confirmSetup);
  const quit = useGameStore((s) => s.quit);

  const [selectedRank, setSelectedRank] = useState<Rank | null>(() => nextRankToPlace(draft));
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [showFormations, setShowFormations] = useState(false);

  const remaining = remainingToPlace(draft);
  const complete = isDraftComplete(draft);

  const cells = useMemo(() => {
    const out: (BoardCell | null)[] = Array.from({ length: 100 }, () => null);
    for (const [index, rank] of Object.entries(draft)) out[Number(index)] = { owner: HUMAN, rank };
    return out;
  }, [draft]);

  function onCellClick(index: number) {
    if (!ZONE.has(index)) return;
    if (selectedCell !== null) {
      // Peça já colocada selecionada: mover/trocar.
      if (selectedCell !== index) setDraft(movePlaced(draft, HUMAN, selectedCell, index));
      setSelectedCell(null);
      return;
    }
    if (selectedRank && draft[index] === undefined) {
      const next = placeRank(draft, HUMAN, index, selectedRank);
      setDraft(next);
      setSelectedRank(nextRankToPlace(next, selectedRank));
      return;
    }
    if (draft[index] !== undefined) setSelectedCell(index);
  }

  function pickRank(rank: Rank) {
    if (selectedCell !== null) {
      // Com uma peça selecionada, tocar na bandeja devolve a peça.
      const next = removePlaced(draft, selectedCell);
      setDraft(next);
      setSelectedCell(null);
      setSelectedRank(rank);
      return;
    }
    setSelectedRank(remaining[rank] > 0 ? rank : null);
  }

  function fill(kind: 'random' | 'smart') {
    const placements = (kind === 'smart' ? smartRandomSetup : randomSetup)(HUMAN, freshRng());
    setDraft(draftFromPlacements(placements));
    setSelectedCell(null);
    setSelectedRank(null);
  }

  return (
    <div className="game-layout">
      <div className="flex flex-col items-center gap-2">
        <Board
          cells={cells}
          me={HUMAN}
          zone={ZONE}
          selected={selectedCell}
          onCellClick={onCellClick}
          canDrag={(i) => draft[i] !== undefined}
          onDrop={(from, to) => {
            setDraft(movePlaced(draft, HUMAN, from, to));
            setSelectedCell(null);
          }}
        />
      </div>

      <aside className="panel">
        <header className="flex items-center justify-between gap-2">
          <h2 className="font-pixel text-sm">Posicionamento</h2>
          <span className="text-lg">{draftSize(draft)}/40</span>
        </header>
        <p className="text-base leading-tight opacity-80">
          {selectedCell !== null
            ? 'Toque em outra casa para mover/trocar, ou na bandeja para devolver a peça.'
            : selectedRank
              ? `Toque nas casas iluminadas para colocar: ${rankWithStrength(selectedRank)}.`
              : 'Toque numa peça da bandeja ou do tabuleiro.'}
        </p>

        <div className="grid grid-cols-6 gap-1.5 landscape:grid-cols-4">
          {RANKS.map((rank) => (
            <button
              key={rank}
              type="button"
              onClick={() => pickRank(rank)}
              className={`relative aspect-square ${selectedRank === rank && selectedCell === null ? 'ring-4 ring-yellow-300' : ''}`}
              aria-label={`${rankWithStrength(rank)}: faltam ${remaining[rank]}`}
            >
              <PieceTile owner={HUMAN} rank={rank} dimmed={remaining[rank] === 0} />
              <span className="absolute -right-1 -bottom-1 min-w-5 bg-black px-1 text-sm leading-5">
                {remaining[rank]}
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn" onClick={() => fill('random')}>
            Aleatório
          </button>
          <button type="button" className="btn" onClick={() => fill('smart')}>
            Inteligente
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setDraft(emptyDraft);
              setSelectedCell(null);
              setSelectedRank(nextRankToPlace(emptyDraft));
            }}
          >
            Limpar
          </button>
          <button type="button" className="btn" onClick={() => setShowFormations((v) => !v)}>
            Formações
          </button>
        </div>

        {showFormations && (
          <FormationsPanel
            draft={draft}
            onLoad={(d) => {
              setDraft(d);
              setSelectedCell(null);
              setSelectedRank(nextRankToPlace(d));
              setShowFormations(false);
            }}
          />
        )}

        <div className="mt-auto flex gap-2">
          <button type="button" className="btn flex-1" onClick={quit}>
            Menu
          </button>
          <button
            type="button"
            className="btn btn-primary flex-[2]"
            disabled={!complete}
            onClick={confirmSetup}
          >
            Confirmar
          </button>
        </div>
      </aside>
    </div>
  );
}
