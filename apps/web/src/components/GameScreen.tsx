'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RANKS,
  getLegalMovesForView,
  getPlayerView,
  opponent,
  remainingCounts,
  toIndex,
  toPos,
  type MoveRecord,
  type Player,
  type PlayerView,
} from '@ldf/engine';
import { DIFFICULTIES } from '@ldf/ai';
import { Board, type BoardCell } from './Board';
import { PieceTile } from './PieceTile';
import { CombatOverlay, combatText } from './CombatOverlay';
import { MuteButton } from './MuteButton';
import { AI, HUMAN, useGameStore } from '@/store/game';
import { rankWithStrength, resultText } from '@/lib/text';
import { sfx } from '@/lib/sound';

const AI_DELAY_MS = 550;

export function GameScreen() {
  const game = useGameStore((s) => s.game);
  const lastRecord = useGameStore((s) => s.lastRecord);
  const lastCombat = useGameStore((s) => s.lastCombat);
  const difficulty = useGameStore((s) => s.difficulty);
  const playHuman = useGameStore((s) => s.playHuman);
  const playAi = useGameStore((s) => s.playAi);
  const resign = useGameStore((s) => s.resign);
  const newGame = useGameStore((s) => s.newGame);
  const quit = useGameStore((s) => s.quit);

  // A UI só usa a visão do jogador humano.
  const view = useMemo(() => (game ? getPlayerView(game, HUMAN) : null), [game]);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmResign, setConfirmResign] = useState(false);

  const legal = useMemo(() => (view ? getLegalMovesForView(view) : []), [view]);
  const targets = useMemo(() => {
    if (selected === null) return new Set<number>();
    return new Set(legal.filter((m) => toIndex(m.from) === selected).map((m) => toIndex(m.to)));
  }, [legal, selected]);
  const movable = useMemo(() => new Set(legal.map((m) => toIndex(m.from))), [legal]);

  // Animações: só para jogadas novas (não ao recarregar a página).
  const [seenPly, setSeenPly] = useState(lastRecord?.ply ?? 0);
  const [pendingCombat, setPendingCombat] = useState<MoveRecord | null>(null);
  const [slide, setSlide] = useState<{ from: number; to: number; key: number } | null>(null);
  if (lastRecord && lastRecord.ply > seenPly) {
    setSeenPly(lastRecord.ply);
    if (lastRecord.combat) setPendingCombat(lastRecord);
    else
      setSlide({ from: toIndex(lastRecord.from), to: toIndex(lastRecord.to), key: lastRecord.ply });
  }
  useEffect(() => {
    if (slide) sfx.move();
  }, [slide]);
  const endCombat = useCallback(() => setPendingCombat(null), []);

  const turn = view?.turn;
  const phase = view?.phase;
  const busy = pendingCombat !== null;
  useEffect(() => {
    if (phase !== 'playing' || turn !== AI || busy) return;
    const t = setTimeout(playAi, AI_DELAY_MS);
    return () => clearTimeout(t);
  }, [phase, turn, game, playAi, busy]);

  // Fanfarra no fim (depois da animação do último combate).
  const endSoundPlayed = useRef(phase === 'finished');
  const winner = view?.result?.winner;
  useEffect(() => {
    if (phase !== 'finished' || busy || endSoundPlayed.current) return;
    endSoundPlayed.current = true;
    if (winner === HUMAN) sfx.victory();
    else sfx.defeat();
  }, [phase, busy, winner]);

  if (!view) return null;

  function play(from: number, to: number) {
    playHuman({ from: toPos(from), to: toPos(to) });
    setSelected(null);
  }

  function onCellClick(index: number) {
    if (!view || view.turn !== HUMAN || busy) return;
    if (selected !== null && targets.has(index)) {
      play(selected, index);
      return;
    }
    const next = movable.has(index) && selected !== index ? index : null;
    if (next !== null) sfx.select();
    setSelected(next);
  }

  function onDrop(from: number, to: number) {
    if (legal.some((m) => toIndex(m.from) === from && toIndex(m.to) === to)) play(from, to);
  }

  const cells: (BoardCell | null)[] = view.board.map((p) =>
    p
      ? { owner: p.owner, rank: p.hidden ? undefined : p.rank, revealed: !p.hidden && p.revealed }
      : null,
  );
  const last = lastRecord ? { from: toIndex(lastRecord.from), to: toIndex(lastRecord.to) } : null;
  const difficultyLabel = DIFFICULTIES.find((d) => d.id === difficulty)?.label;

  return (
    <div className="game-layout">
      <div className="relative flex flex-col items-center gap-2">
        <Board
          cells={cells}
          me={HUMAN}
          selected={selected}
          targets={targets}
          lastMove={last}
          slide={slide}
          onCellClick={onCellClick}
          canDrag={(i) => view.turn === HUMAN && !busy && movable.has(i)}
          onDrop={onDrop}
        />
        {pendingCombat && <CombatOverlay record={pendingCombat} me={HUMAN} onDone={endCombat} />}
        {!busy && view.phase === 'finished' && view.result && (
          <ResultOverlay view={view} onAgain={() => newGame(difficulty)} onMenu={quit} />
        )}
      </div>

      <aside className="panel">
        <header className="flex items-center justify-between gap-2">
          <span className="font-pixel text-xs whitespace-nowrap">vs {difficultyLabel}</span>
          <div className="flex items-center gap-2">
            <TurnBadge view={view} />
            <MuteButton />
          </div>
        </header>

        <CombatBanner record={lastCombat} />
        <Casualties view={view} />

        <div className="mt-auto flex gap-2">
          {view.phase === 'playing' ? (
            confirmResign ? (
              <>
                <button
                  type="button"
                  className="btn flex-1"
                  onClick={() => setConfirmResign(false)}
                >
                  Continuar
                </button>
                <button
                  type="button"
                  className="btn btn-danger flex-1"
                  onClick={() => {
                    resign();
                    setConfirmResign(false);
                  }}
                >
                  Desistir mesmo
                </button>
              </>
            ) : (
              <button type="button" className="btn flex-1" onClick={() => setConfirmResign(true)}>
                Desistir
              </button>
            )
          ) : (
            <button type="button" className="btn flex-1" onClick={quit}>
              Menu
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

function TurnBadge({ view }: { view: PlayerView }) {
  if (view.phase !== 'playing') return <span className="text-lg">Fim de jogo</span>;
  const mine = view.turn === HUMAN;
  return (
    <span
      className={`px-2 text-lg whitespace-nowrap ${mine ? 'animate-pulse bg-yellow-300 text-black' : 'bg-black/40'}`}
    >
      {mine ? 'Sua vez' : 'Vez da IA…'}
    </span>
  );
}

function CombatBanner({ record }: { record: MoveRecord | null }) {
  if (!record?.combat) {
    return (
      <div className="flex h-20 items-center justify-center border-2 border-black/40 bg-black/20 px-2 text-center opacity-70">
        Toque numa peça sua para ver as jogadas. Atacar revela as duas peças.
      </div>
    );
  }
  const { combat, player } = record;
  const defender: Player = opponent(player);
  const text = combatText(record);
  return (
    <div className="flex h-20 items-center gap-3 border-2 border-black/40 bg-black/30 px-2">
      <div className="h-12 w-12 shrink-0">
        <PieceTile owner={player} rank={combat.attackerRank} />
      </div>
      <span className="font-pixel text-xs">×</span>
      <div className="h-12 w-12 shrink-0">
        <PieceTile owner={defender} rank={combat.defenderRank} />
      </div>
      <p className="text-lg leading-tight">
        {player === HUMAN ? 'Você atacou.' : 'Você foi atacado.'} {text}
      </p>
    </div>
  );
}

function Casualties({ view }: { view: PlayerView }) {
  const enemy = remainingCounts(view.lost[AI]);
  const mine = remainingCounts(view.lost[HUMAN]);
  return (
    <section>
      <h3 className="mb-1 text-lg opacity-80">Peças restantes (inimigo · você)</h3>
      <ul className="grid grid-cols-3 gap-1 sm:grid-cols-4 landscape:grid-cols-3">
        {RANKS.map((rank) => (
          <li
            key={rank}
            className={`flex items-center gap-1 bg-black/25 p-1 ${enemy[rank] === 0 ? 'opacity-40' : ''}`}
            title={rankWithStrength(rank)}
          >
            <div className="h-7 w-7 shrink-0">
              <PieceTile owner={AI} rank={rank} />
            </div>
            <span className="text-lg leading-none">
              {enemy[rank]}
              <span className="opacity-60"> · {mine[rank]}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ResultOverlay({
  view,
  onAgain,
  onMenu,
}: {
  view: PlayerView;
  onAgain: () => void;
  onMenu: () => void;
}) {
  const { title, detail } = resultText(view.result!, HUMAN);
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/55 p-4">
      <div className="panel w-full max-w-xs items-center text-center shadow-[0_6px_0_rgba(0,0,0,0.5)]">
        <h2 className="font-pixel text-xl">{title}</h2>
        <p className="text-xl">{detail}</p>
        <p className="opacity-70">{view.ply} jogadas</p>
        <div className="flex w-full gap-2">
          <button type="button" className="btn flex-1" onClick={onMenu}>
            Menu
          </button>
          <button type="button" className="btn btn-primary flex-1" onClick={onAgain}>
            Jogar de novo
          </button>
        </div>
      </div>
    </div>
  );
}
