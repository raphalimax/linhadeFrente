import { BOARD_SIZE, RANKS, RANK_INFO, SETUP_ROWS, isLake } from '@ldf/engine';

/** Tela provisória (fase 0): confirma que o app consome o motor compartilhado. */
export default function Home() {
  const cells = [];
  // y=9 no topo, para o jogador A (vermelho) ficar embaixo.
  for (let y = BOARD_SIZE - 1; y >= 0; y--) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const lake = isLake({ x, y });
      const zone = SETUP_ROWS.A.includes(y) ? 'A' : SETUP_ROWS.B.includes(y) ? 'B' : null;
      const bg = lake
        ? 'bg-lake'
        : zone === 'A'
          ? 'bg-army-red/40'
          : zone === 'B'
            ? 'bg-army-blue/40'
            : (x + y) % 2
              ? 'bg-grass'
              : 'bg-grass-alt';
      cells.push(<div key={`${x},${y}`} className={`aspect-square ${bg}`} />);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-6 px-4 py-10">
      <h1 className="text-3xl font-bold tracking-widest uppercase">Linha de Frente</h1>
      <div
        className="pixelated grid w-full grid-cols-10 border-4 border-black/60"
        aria-label="Tabuleiro 10x10"
      >
        {cells}
      </div>
      <ul className="grid w-full grid-cols-2 gap-x-4 text-sm">
        {RANKS.map((rank) => (
          <li key={rank} className="flex justify-between">
            <span>{RANK_INFO[rank].label}</span>
            <span>x{RANK_INFO[rank].count}</span>
          </li>
        ))}
      </ul>
      <p className="text-center text-sm opacity-70">Em construção — motor de regras pronto.</p>
    </main>
  );
}
