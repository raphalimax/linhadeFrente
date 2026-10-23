# Linha de Frente — Especificação

> Nome provisório (alternativas: Patente, Insígnia, Névoa de Guerra). Jogo de estratégia com informação oculta para 2 jogadores, inspirado nas regras do Combate (Estrela). **Não usar** os nomes "Combate"/"Stratego" nem arte da Estrela. Projeto pessoal (eu + amigos).

## Visão geral
- Plataforma: navegador, desktop e celular (retrato e paisagem).
- Modos:
  1. **vs IA**, com 3 níveis de dificuldade.
  2. **Online 1v1** em tempo real, com timer por jogada e sala por link/código, sem login.
- Visual: militar, pixel art. Começar com placeholders gerados; a arte final será enviada depois (ver "Assets").

## Stack
| Camada | Escolha | Motivo |
|---|---|---|
| Monorepo | pnpm workspaces | motor compartilhado entre web e servidor |
| Motor de regras | `packages/engine`, TypeScript puro, sem dependências | roda no browser (IA) e no servidor (online) |
| Testes | Vitest | o motor tem que ser 100% testado |
| Web | Next.js (App Router) + TypeScript + Tailwind, deploy na Vercel | |
| Estado da UI | Zustand | |
| Tabuleiro | DOM/CSS Grid + `image-rendering: pixelated` | simples, responsivo, acessível; não precisa de engine de jogo |
| IA | Web Worker | não travar a UI |
| Online (fase 6) | Cloudflare Workers + Durable Objects (WebSocket) | 1 Durable Object por sala = servidor autoritativo com estado; a Vercel serverless não mantém WebSocket |

### Regra de arquitetura (inegociável)
O servidor/motor é a única autoridade. **Nenhum cliente nem a IA recebe a patente de peças inimigas não reveladas.** O motor expõe `getPlayerView(state, player)`, que devolve o tabuleiro com as peças inimigas ocultas como `{ owner, hidden: true }` (mais os metadados públicos, como "já se moveu" e "revelada como X"). A IA recebe **apenas** o `PlayerView`, exatamente o que um cliente online recebe. Assim, a IA não consegue trapacear por construção.

```
apps/
  web/        # Next.js (Vercel)
  server/     # Cloudflare Worker + Durable Object (fase 6)
packages/
  engine/     # regras, estado, view, validação de jogadas
  ai/         # bots (consomem PlayerView)
```

## Regras (Combate/Estrela)

### Tabuleiro
- 10x10. Coordenadas `(x, y)`, com `y=0..3` para o jogador A e `y=6..9` para o jogador B.
- Lagos (casas intransitáveis): `(2,4) (3,4) (2,5) (3,5)` e `(6,4) (7,4) (6,5) (7,5)`.

### Exército (40 peças por jogador)
| Força | Peça | Qtd | Móvel |
|---|---|---|---|
| 1 | Agente Secreto | 1 | sim |
| 2 | Soldado | 8 | sim (especial) |
| 3 | Cabo | 5 | sim |
| 4 | Sargento | 4 | sim |
| 5 | Subtenente | 4 | sim |
| 6 | Tenente | 4 | sim |
| 7 | Capitão | 3 | sim |
| 8 | Major | 2 | sim |
| 9 | Coronel | 1 | sim |
| 10 | General | 1 | sim |
| — | Prisioneiro | 1 | não |
| — | Mina Terrestre | 6 | não |

### Posicionamento
- Cada jogador posiciona as 40 peças nas suas 4 fileiras, sem ver o lado do adversário.
- Opções: manual (tocar na peça do painel e depois na casa; trocar duas peças já colocadas), **aleatório**, **aleatório inteligente** (prisioneiro no fundo, cercado de minas) e **formações salvas** (localStorage, com nome).
- O jogo começa quando os dois confirmam. Quem começa é sorteado.

### Movimento
- Um movimento por turno: uma peça anda uma casa na ortogonal (sem diagonal).
- Não pode entrar em lago, não pode pular peças e não pode ir para uma casa ocupada por peça própria.
- Prisioneiro e Minas não se movem.
- **Soldado:** anda quantas casas quiser em linha reta, sem atravessar peças ou lagos. **Se andar mais de 1 casa, não pode atacar nesse turno.** Para atacar, só pode andar 1 casa, entrando na casa do inimigo. Ao andar mais de 1 casa, fica revelado publicamente como Soldado.
- **Regra das 3 rodadas:** uma mesma peça não pode ir e voltar entre as mesmas duas casas mais de 3 vezes seguidas. A 4ª jogada desse vai-e-volta é ilegal. O contador zera quando a peça faz outro movimento ou quando o jogador move outra peça. Implementar com histórico por peça e testar bem.

### Combate
Mover para a casa de uma peça inimiga é atacar. As duas peças são reveladas aos dois jogadores e permanecem marcadas como "reveladas" pelo resto da partida.
- Força maior vence; a perdedora sai do jogo. A vencedora ocupa a casa se for a atacante e fica onde está se for a defensora.
- Forças iguais: as duas saem.
- **Agente Secreto ataca o General:** o General sai. **General ataca o Agente:** o Agente sai, pela regra normal. Contra qualquer outra peça, o Agente é força 1.
- **Atacar uma Mina:** a peça atacante sai **e a Mina também é retirada** (regra da Estrela, diferente do Stratego).
- **Cabo ataca uma Mina:** a Mina é desativada e sai; o Cabo sobrevive e ocupa a casa.
- **Atacar o Prisioneiro:** vitória imediata do atacante.

### Fim de jogo
- Resgatar (atacar) o Prisioneiro inimigo.
- O adversário fica só com Minas + Prisioneiro, ou não tem nenhum movimento legal: derrota dele.
- Online: desistência, 3 timeouts ou abandono (ver abaixo).

## IA (pacote `ai`, roda em Web Worker)
Toda IA recebe `PlayerView` + histórico público. Ela mantém um modelo de crença: para cada peça inimiga oculta, as patentes possíveis, restringidas pelo que já se sabe. Uma peça que se moveu não é Mina nem Prisioneiro; uma que andou mais de 1 casa é Soldado; as patentes reveladas e mortas saem do conjunto possível.

- **Recruta (fácil):** jogada legal aleatória, com preferência leve por atacar peças reveladas mais fracas e evitar as reveladas mais fortes.
- **Sargento (médio):** heurística, com avaliação de material, segurança do General e do Prisioneiro, uso de Soldados para sondar, Cabos guardados para minas, avanço e ameaças. Busca de 1–2 lances sobre a crença (valor esperado).
- **General (difícil):** determinização + MCTS. Amostra N tabuleiros inimigos consistentes com a crença, roda busca em cada um e escolhe a jogada com maior média. Tempo limite configurável (ex.: 1,5s por jogada).
- A IA também faz o posicionamento, com formações variadas e geradas por regras (prisioneiro protegido, minas de isca).
- Expectativa: o nível difícil é desafiador, não imbatível.

## Online (fase 6)
- Criar sala → código curto (ex.: `K7QF`) + link `/sala/K7QF`. O segundo jogador entra pelo link ou digitando o código. Nickname local, sem login.
- 1 Durable Object por sala guarda o estado completo, valida cada jogada com o `engine` e envia a cada jogador só o seu `PlayerView`.
- **Timers:** posicionamento de 3 min (ao estourar, completa o resto de forma aleatória e confirma); jogada de 30s (configurável na criação: 15/30/60s).
- **Timeout de jogada:** o jogador perde a vez; no 3º timeout da partida, perde o jogo.
- **Desconexão:** a partida pausa por até 60s esperando reconexão, que é reconhecida por um token salvo em localStorage. Depois disso, derrota por abandono.
- Revanche na mesma sala, com troca de quem começa.
- Fora do escopo: ranking, contas, chat (no máximo reações rápidas pré-definidas).

## UI / UX
- Mobile first. Tabuleiro quadrado ocupando a largura em retrato, painel embaixo. Em paisagem, painel na lateral.
- Interação por toque: tocar a peça mostra as casas válidas destacadas; tocar o destino move. No desktop, arrastar também funciona.
- Peças inimigas aparecem com o verso (cor do exército, sem patente). As reveladas mostram a patente com um marcador.
- Animação curta de combate mostrando as duas peças lado a lado e o resultado.
- Painel "baixas": contagem de peças inimigas restantes por patente (no Combate físico isso é público).
- Telas: Menu → (vs IA: escolher dificuldade | Online: criar/entrar) → Posicionamento → Partida → Resultado.
- Som opcional, mutável.

## Assets (pixel art)
- Começar com placeholders gerados por código: quadrado na cor do exército + número da força + ícone simples.
- Contrato para a arte final, para que trocar seja só soltar arquivos:
  - Sprites de 32x32 px, PNG com transparência, escalados com nearest-neighbor.
  - `apps/web/public/sprites/{verde|azul}/{agente,soldado,cabo,sargento,subtenente,tenente,capitao,major,coronel,general,prisioneiro,mina,verso}.png`
  - Terreno: `public/sprites/tiles/{grama,lago,borda}.png`
  - Fonte pixel com licença OFL.

## Fases de implementação
0. **Setup:** monorepo, lint, Vitest, Next.js na Vercel e CI rodando os testes.
1. **Motor:** estado, posicionamento válido, geração e validação de jogadas, combate, regra das 3 rodadas, Soldado, fim de jogo, `getPlayerView`, RNG com seed. **Testes para cada regra acima**, incluindo casos de borda (Agente × General nos dois sentidos, Cabo × Mina, Soldado que andou 2 e tenta atacar, vai-e-volta, sem movimentos legais).
2. **UI local vs IA Recruta:** tabuleiro, posicionamento completo (manual, aleatório e formações salvas) e partida até o fim.
3. **IA Sargento e General,** no Worker, com seletor de dificuldade.
4. **Polimento mobile,** animações e som.
5. **Arte final** (quando chegar).
6. **Online:** Worker + Durable Object, salas, timers, reconexão e revanche.

Critério de pronto de cada fase: testes passando, deploy na Vercel funcionando e jogável no celular.
