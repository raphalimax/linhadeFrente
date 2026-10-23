import { RANK_INFO } from './constants';
import type { CombatOutcome, Rank } from './types';

/**
 * Resolve um ataque. Regras (Combate/Estrela):
 * - Prisioneiro atacado: o atacante vence (e a partida acaba).
 * - Mina atacada: Cabo desativa a Mina (Cabo vence); qualquer outra peça sai
 *   junto com a Mina.
 * - Agente Secreto atacando o General: Agente vence.
 * - Demais casos: força maior vence; forças iguais, as duas saem.
 */
export function resolveCombat(attacker: Rank, defender: Rank): CombatOutcome {
  const attackerStrength = RANK_INFO[attacker].strength;
  if (attackerStrength === null) {
    throw new Error(`Peça imóvel não pode atacar: ${attacker}`);
  }
  if (defender === 'prisioneiro') return 'attacker_wins';
  if (defender === 'mina') return attacker === 'cabo' ? 'attacker_wins' : 'both_removed';
  if (attacker === 'agente' && defender === 'general') return 'attacker_wins';

  const defenderStrength = RANK_INFO[defender].strength as number;
  if (attackerStrength > defenderStrength) return 'attacker_wins';
  if (attackerStrength < defenderStrength) return 'defender_wins';
  return 'both_removed';
}
