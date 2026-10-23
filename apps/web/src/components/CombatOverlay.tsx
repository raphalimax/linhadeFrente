'use client';

import { useEffect } from 'react';
import { opponent, type MoveRecord, type Player } from '@ldf/engine';
import { PieceTile } from './PieceTile';
import { rankWithStrength } from '@/lib/text';
import { sfx } from '@/lib/sound';

/** Duração total da animação (ms). Tocar na tela pula. */
export const COMBAT_ANIMATION_MS = 1600;
const RESULT_AT_MS = 650;

interface CombatOverlayProps {
  record: MoveRecord;
  me: Player;
  onDone: () => void;
}

export function combatText(record: MoveRecord): string {
  const combat = record.combat!;
  if (combat.defenderRank === 'prisioneiro') return 'Prisioneiro resgatado!';
  if (combat.defenderRank === 'mina') {
    return combat.outcome === 'attacker_wins' ? 'Mina desativada!' : 'Mina explodiu!';
  }
  if (combat.outcome === 'both_removed') return 'Empate: as duas saem.';
  if (combat.attackerRank === 'agente' && combat.defenderRank === 'general') {
    return 'O Agente eliminou o General!';
  }
  const winner = combat.outcome === 'attacker_wins' ? combat.attackerRank : combat.defenderRank;
  return `${rankWithStrength(winner)} vence.`;
}

/** Duas peças lado a lado: entram, se chocam e a(s) perdedora(s) cai(em). */
export function CombatOverlay({ record, me, onDone }: CombatOverlayProps) {
  const combat = record.combat!;
  const attacker = record.player;
  const defender = opponent(attacker);
  const attackerLoses = combat.outcome !== 'attacker_wins';
  const defenderLoses = combat.outcome !== 'defender_wins';
  const iWon =
    (attacker === me && combat.outcome === 'attacker_wins') ||
    (defender === me && combat.outcome === 'defender_wins');
  const exploded = combat.defenderRank === 'mina' && combat.outcome === 'both_removed';

  useEffect(() => {
    sfx.clash();
    const result = setTimeout(() => {
      if (exploded) sfx.explosion();
      else if (iWon) sfx.win();
      else sfx.lose();
    }, RESULT_AT_MS);
    const done = setTimeout(onDone, COMBAT_ANIMATION_MS);
    return () => {
      clearTimeout(result);
      clearTimeout(done);
    };
  }, [exploded, iWon, onDone]);

  return (
    <button
      type="button"
      className="combat-overlay absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/60"
      onClick={onDone}
      aria-label="Pular animação de combate"
    >
      <p className="font-pixel text-sm text-yellow-200 [text-shadow:2px_2px_0_#000]">
        {attacker === me ? 'Você ataca!' : 'Você foi atacado!'}
      </p>
      <div className="flex items-center gap-[6%]">
        <div
          className={`combat-left aspect-square w-[min(28vw,9rem)] ${attackerLoses ? (exploded ? 'combat-boom' : 'combat-fall') : 'combat-win'}`}
        >
          <PieceTile owner={attacker} rank={combat.attackerRank} />
        </div>
        <span className="combat-x font-pixel text-2xl text-red-400 [text-shadow:2px_2px_0_#000]">
          ×
        </span>
        <div
          className={`combat-right aspect-square w-[min(28vw,9rem)] ${defenderLoses ? (exploded ? 'combat-boom' : 'combat-fall') : 'combat-win'}`}
        >
          <PieceTile owner={defender} rank={combat.defenderRank} />
        </div>
      </div>
      <p className="combat-result px-4 text-center text-2xl text-white [text-shadow:2px_2px_0_#000]">
        {combatText(record)}
      </p>
    </button>
  );
}
