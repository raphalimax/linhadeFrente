'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { AI, HUMAN, useGameStore } from '@/store/game';
import { rankWithStrength, resultText } from '@/lib/text';

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

  const turn = view?.turn;
  const phase = view?.phase;
  useEffect(() => {
    if (phase !== 'playing' || turn !== AI) return;
    const t = setTimeout(playAi, AI_DELAY_MS);
    return () => clearTimeout(t);
  }, [phase, turn, game, playAi]);

  if (!view) return null;

  function onCellClick(index: number) {
    if (!view || view.turn !== HUMAN) return;
    if (selected !== null && targets.has(index)) {
      playHuman({ from: toPos(selected), to: toPos(index) });
      setSelected(null);
      return;
    }
    setSelected(movable.has(index) && selected !== index ? index : null);
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
          onCellClick={onCellClick}
        />
        {view.phase === 'finished' && view.result && (
          <ResultOverlay view={view} onAgain={() => newGame(difficulty)} onMenu={quit} />
        )}
      </div>

      <aside className="panel">
        <header className="flex items-center justify-between gap-2">
          <span className="font-pixel text-xs">vs {difficultyLabel}</span>
          <TurnBadge view={view} />
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
      className={`px-2 text-lg ${mine ? 'animate-pulse bg-yellow-300 text-black' : 'bg-black/40'}`}
    >
      {mine ? 'Sua vez' : 'Inimigo pensando…'}
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
  const text =
    combat.defenderRank === 'prisioneiro'
      ? 'Prisioneiro resgatado!'
      : combat.outcome === 'both_removed'
        ? 'As duas peças saem.'
        : combat.outcome === 'attacker_wins'
          ? combat.defenderRank === 'mina'
            ? 'Mina desativada!'
            : `${rankWithStrength(combat.attackerRank)} vence.`
          : `${rankWithStrength(combat.defenderRank)} vence.`;
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
