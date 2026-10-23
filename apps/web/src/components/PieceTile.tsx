import { RANK_INFO, type Player, type Rank } from '@ldf/engine';

/** Abreviações das patentes (painéis e leitores de tela). */
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

export function rankShort(rank: Rank): string {
  return SHORT[rank];
}

/** Pasta dos sprites de cada exército: `public/sprites/{verde|azul}/{patente}.png`. */
export const ARMY_FOLDER: Record<Player, 'verde' | 'azul'> = { A: 'verde', B: 'azul' };

export function spriteUrl(owner: Player, rank: Rank): string {
  return `/sprites/${ARMY_FOLDER[owner]}/${rank}.png`;
}

const ARMY_STYLE: Record<Player, string> = {
  A: 'border-army-a bg-tile/90',
  B: 'border-army-b bg-tile/90',
};

const VERSO_STYLE: Record<Player, string> = {
  A: 'border-army-a-dark bg-army-a',
  B: 'border-army-b-dark bg-army-b',
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
 * Peça: sprite 32×32 ampliado sem suavização, com a força num selo (o nome da
 * patente fica a cargo da interface). Peça oculta mostra o verso, desenhado em CSS.
 */
export function PieceTile({ owner, rank, revealed, dimmed }: PieceTileProps) {
  const strength = rank ? RANK_INFO[rank].strength : null;
  return (
    <div
      className={`@container relative h-full w-full border-2 ${rank ? ARMY_STYLE[owner] : VERSO_STYLE[owner]} shadow-[inset_-2px_-2px_0_rgba(0,0,0,0.3),inset_2px_2px_0_rgba(255,255,255,0.15)] ${dimmed ? 'opacity-40 grayscale' : ''}`}
      title={rank ? RANK_INFO[rank].label : 'Peça oculta'}
    >
      {rank ? (
        <>
          <div
            className="pixelated absolute inset-0 bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${spriteUrl(owner, rank)})` }}
            role="img"
            aria-label={RANK_INFO[rank].label}
          />
          {strength !== null && (
            <span className="font-pixel absolute top-0 left-0 bg-black/75 px-[5cqw] py-[4cqw] text-[28cqw] leading-none text-yellow-100">
              {strength}
            </span>
          )}
        </>
      ) : (
        <span className="font-pixel absolute inset-0 flex items-center justify-center text-[38cqw] text-white/45">
          ★
        </span>
      )}
      {revealed && (
        <span
          className="absolute top-0 right-0 h-0 w-0 border-t-[22cqw] border-l-[22cqw] border-t-yellow-300 border-l-transparent"
          aria-label="revelada"
        />
      )}
    </div>
  );
}
