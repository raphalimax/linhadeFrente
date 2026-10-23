# Linha de Frente

Jogo de estratégia com informação oculta para 2 jogadores, no navegador. Especificação completa em [SPEC.md](SPEC.md).

## Estrutura

```
apps/
  web/        # Next.js (App Router) + Tailwind — deploy na Vercel
packages/
  engine/     # motor de regras em TypeScript puro (sem dependências), 100% testado
  ai/         # bots; recebem só o PlayerView (Recruta pronto)
```

## Desenvolvimento

Requer Node 20+ e pnpm 10 (`npm i -g pnpm` ou `corepack enable`).

```bash
pnpm install
pnpm dev          # Next.js em http://localhost:3000
pnpm test         # testes (Vitest) com cobertura
pnpm lint
pnpm typecheck
pnpm build
pnpm format       # Prettier
```

## Motor (`@ldf/engine`)

API principal (tudo puro e imutável; cada função devolve um novo estado):

| Função                                        | O que faz                                                                                                                   |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `createGame({ seed })`                        | Novo jogo na fase de posicionamento. RNG com seed guardado no estado.                                                       |
| `validateSetup`, `submitSetup`                | Valida/confirma as 40 peças de um jogador. Com os dois prontos, sorteia quem começa.                                        |
| `randomSetup`, `smartRandomSetup`             | Posicionamento aleatório e aleatório inteligente (Prisioneiro no fundo cercado de Minas).                                   |
| `getLegalMoves`, `validateMove`, `applyMove`  | Geração, validação (com código do motivo) e aplicação de jogadas, incluindo combate.                                        |
| `forfeit`                                     | Desistência, timeout ou abandono.                                                                                           |
| `getPlayerView`                               | O que um jogador pode ver: peças inimigas ocultas viram `{ owner, hidden: true }`. É o que a IA e o cliente online recebem. |
| `getLegalMovesForView`, `validateMoveForView` | As mesmas regras de movimento, a partir de um `PlayerView`.                                                                 |
| `remainingCounts`                             | Peças restantes por patente (painel de baixas).                                                                             |

Decisões de regra que a especificação deixava em aberto:

- **Vai-e-volta:** conta as jogadas seguidas _do mesmo jogador_ com a mesma peça entre as mesmas duas casas (o Soldado andando várias casas também conta). A 4ª é ilegal. Ataques não contam e zeram o contador.
- **Sem peças móveis:** verificado logo após cada jogada; se os dois lados ficam sem peças móveis ao mesmo tempo, é empate (`winner: null`).
- **Sem jogadas legais:** verificado no início da vez (inclusive a primeira); quem não tem jogada perde.
- **View:** durante o posicionamento as peças inimigas não aparecem; ao fim da partida tudo é revelado.

## Jogo (`apps/web`)

- `/` — menu (dificuldade da IA; online ainda desabilitado).
- `/jogo` — posicionamento (manual, aleatório, inteligente e formações salvas no navegador) e partida até o fim.
- A partida local fica salva no `localStorage` (sobrevive a recarregar a página). O estado completo faz o papel do servidor; a tela e a IA só usam `getPlayerView`.
- Sprites 32×32 em `apps/web/public/sprites/{verde|azul}/{patente}.png` (A = verde, B = azul). Para trocar a arte, basta substituir o arquivo com o mesmo nome. Provisórios: `subtenente.png` é cópia do sargento e o verso (peça oculta) e o terreno são desenhados em CSS.

## Deploy (Vercel)

Importe o repositório na Vercel com **Root Directory = `apps/web`**. A Vercel detecta o pnpm e o workspace sozinha.
