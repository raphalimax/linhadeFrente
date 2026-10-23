import { RANK_INFO, type Player, type Rank } from '@ldf/engine';

/** Abreviações das patentes para as peças provisórias. */
const SHORT: Record<Rank, string> = {
  agente: 'AGT',
  soldado: 'SLD',
  cabo: 'CBO',
  sargento: 'SGT',
  subtenente: 'STN',
  tenente: 'TEN',
  capitao: 'CAP',
  major: 'MAJ',
  coronel: 'CEL',
  general: 'GEN',
  prisioneiro: 'PRI',
  mina: 'MIN',
};

const SYMBOL: Partial<Record<Rank, string>> = { mina: '✹', prisioneiro: '⚑' };

export function rankGlyph(rank: Rank): string {
  return SYMBOL[rank] ?? String(RANK_INFO[rank].strength);
}

export function rankShort(rank: Rank): string {
  return SHORT[rank];
}

const ARMY_BG: Record<Player, string> = {
  A: 'bg-army-red border-army-red-dark',
  B: 'bg-army-blue border-army-blue-dark',
};

interface PieceTileProps {
  owner: Player;
  /** `undefined` = verso (patente desconhecida). */
  rank?: Rank;
  /** Patente conhecida pelo adversário (mostra o marcador). */
  revealed?: boolean;
  dimmed?: boolean;
}

/**
 * Peça provisória gerada por código: quadrado na cor do exército, força e
 * abreviação. Será trocada pelos sprites de `public/sprites` na fase 5.
 */
export function PieceTile({ owner, rank, revealed, dimmed }: PieceTileProps) {
  return (
    <div
      className={`relative flex h-full w-full flex-col items-center justify-center border-2 leading-none text-white shadow-[inset_-2px_-2px_0_rgba(0,0,0,0.35),inset_2px_2px_0_rgba(255,255,255,0.2)] ${ARMY_BG[owner]} ${dimmed ? 'opacity-50' : ''}`}
    >
      {rank ? (
        <>
          <span className="font-pixel text-[min(3.2vw,1.1rem)] landscape:text-[min(2.6vh,1.1rem)]">
            {rankGlyph(rank)}
          </span>
          <span className="mt-[2px] text-[min(2.6vw,0.85rem)] tracking-tight opacity-90 landscape:text-[min(2vh,0.85rem)]">
            {SHORT[rank]}
          </span>
        </>
      ) : (
        <span className="font-pixel text-[min(3vw,1rem)] opacity-60 landscape:text-[min(2.4vh,1rem)]">
          ★
        </span>
      )}
      {revealed && (
        <span
          className="absolute top-0 right-0 h-0 w-0 border-t-[7px] border-l-[7px] border-t-yellow-300 border-l-transparent"
          aria-label="revelada"
        />
      )}
    </div>
  );
}
