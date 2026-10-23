import { describe, expect, it } from 'vitest';
import {
  EngineError,
  applyMove,
  checkMove,
  createGame,
  generateMoves,
  getLegalMoves,
  pieceMoves,
  toIndex,
  validateMove,
  type GameState,
  type Move,
} from '../src';
import { makeState, moveKey, mv, play, playRandomGame } from './helpers';

const keys = (moves: Move[]) => moves.map(moveKey).sort();

function basicState(): GameState {
  return makeState([
    { x: 4, y: 2, owner: 'A', rank: 'tenente' },
    { x: 5, y: 2, owner: 'A', rank: 'mina' },
    { x: 0, y: 0, owner: 'A', rank: 'prisioneiro' },
    { x: 4, y: 3, owner: 'B', rank: 'cabo' },
    { x: 9, y: 9, owner: 'B', rank: 'sargento' },
  ]);
}

describe('movimento básico', () => {
  it('peça comum anda 1 casa na ortogonal, pode atacar, não entra em casa própria', () => {
    const state = basicState();
    const moves = getLegalMoves(state, 'A');
    expect(keys(moves)).toEqual(keys([mv(4, 2, 3, 2), mv(4, 2, 4, 1), mv(4, 2, 4, 3)]));
  });

  it('códigos de erro de validação', () => {
    const s = basicState();
    expect(validateMove(s, 'A', mv(4, 2, 4, 1))).toBeNull();
    expect(validateMove(s, 'A', mv(4, 2, 3, 1))).toBe('not_orthogonal');
    expect(validateMove(s, 'A', mv(4, 2, 4, 2))).toBe('not_orthogonal');
    expect(validateMove(s, 'A', mv(4, 2, 4, 0))).toBe('too_far');
    expect(validateMove(s, 'A', mv(4, 2, 5, 2))).toBe('own_piece');
    expect(validateMove(s, 'A', mv(5, 2, 5, 1))).toBe('immobile_piece');
    expect(validateMove(s, 'A', mv(0, 0, 0, 1))).toBe('immobile_piece');
    expect(validateMove(s, 'A', mv(1, 1, 1, 2))).toBe('no_piece');
    expect(validateMove(s, 'A', mv(4, 3, 3, 3))).toBe('not_your_piece');
    expect(validateMove(s, 'A', mv(4, 2, 4, -1))).toBe('out_of_bounds');
    expect(validateMove(s, 'A', mv(-1, 0, 0, 0))).toBe('out_of_bounds');
    expect(validateMove(s, 'B', mv(4, 3, 3, 3))).toBe('not_your_turn');
    expect(validateMove(createGame({ seed: 1 }), 'A', mv(0, 0, 0, 1))).toBe('game_not_in_progress');
  });

  it('não entra em lago', () => {
    const s = makeState([
      { x: 2, y: 3, owner: 'A', rank: 'major' },
      { x: 9, y: 9, owner: 'B', rank: 'sargento' },
    ]);
    expect(validateMove(s, 'A', mv(2, 3, 2, 4))).toBe('lake');
    expect(keys(getLegalMoves(s, 'A'))).toEqual(
      keys([mv(2, 3, 1, 3), mv(2, 3, 3, 3), mv(2, 3, 2, 2)]),
    );
  });

  it('applyMove marca hasMoved, registra histórico e passa a vez', () => {
    const { state, record } = applyMove(basicState(), mv(4, 2, 4, 1));
    expect(state.board[toIndex({ x: 4, y: 1 })]).toMatchObject({
      rank: 'tenente',
      hasMoved: true,
      revealed: false,
    });
    expect(state.board[toIndex({ x: 4, y: 2 })]).toBeNull();
    expect(state.turn).toBe('B');
    expect(state.ply).toBe(1);
    expect(record).toEqual({
      ply: 1,
      player: 'A',
      pieceId: 'A24',
      from: { x: 4, y: 2 },
      to: { x: 4, y: 1 },
      distance: 1,
      combat: null,
    });
    expect(state.history).toEqual([record]);
  });

  it('jogada ilegal lança EngineError com o código', () => {
    const s = basicState();
    expect(() => applyMove(s, mv(4, 2, 4, 0))).toThrow(EngineError);
    expect(() => applyMove(s, mv(4, 2, 4, 0))).toThrow(/too_far/);
    expect(() => applyMove(createGame({ seed: 1 }), mv(0, 0, 0, 1))).toThrow(
      /game_not_in_progress/,
    );
  });

  it('getLegalMoves vazio para quem não é da vez ou fora de jogo', () => {
    expect(getLegalMoves(basicState(), 'B')).toEqual([]);
    expect(getLegalMoves(createGame({ seed: 1 }), 'A')).toEqual([]);
  });

  it('não altera o estado original (imutável)', () => {
    const s = basicState();
    const snapshot = JSON.stringify(s);
    applyMove(s, mv(4, 2, 4, 3));
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  it('pieceMoves em casa vazia ou peça imóvel é vazio', () => {
    const s = basicState();
    expect(pieceMoves(s.board, toIndex({ x: 1, y: 1 }), null)).toEqual([]);
    expect(pieceMoves(s.board, toIndex({ x: 5, y: 2 }), null)).toEqual([]);
  });
});

describe('Soldado', () => {
  function soldierState(): GameState {
    return makeState([
      { x: 0, y: 0, owner: 'A', rank: 'soldado' },
      { x: 0, y: 9, owner: 'B', rank: 'sargento' },
      { x: 3, y: 0, owner: 'A', rank: 'mina' },
      { x: 2, y: 1, owner: 'A', rank: 'soldado' },
      { x: 9, y: 9, owner: 'B', rank: 'sargento' },
    ]);
  }

  it('anda quantas casas quiser em linha reta, parando em peças e bordas', () => {
    const s = soldierState();
    const moves = keys(pieceMoves(s.board, toIndex({ x: 0, y: 0 }), null));
    const expected: Move[] = [mv(0, 0, 1, 0), mv(0, 0, 2, 0)];
    for (let y = 1; y <= 8; y++) expected.push(mv(0, 0, 0, y));
    expect(moves).toEqual(keys(expected));
  });

  it('não atravessa lagos', () => {
    const s = soldierState();
    const moves = keys(pieceMoves(s.board, toIndex({ x: 2, y: 1 }), null));
    expect(moves).toEqual(
      keys([
        mv(2, 1, 2, 0),
        mv(2, 1, 2, 2),
        mv(2, 1, 2, 3),
        mv(2, 1, 1, 1),
        mv(2, 1, 0, 1),
        ...[3, 4, 5, 6, 7, 8, 9].map((x) => mv(2, 1, x, 1)),
      ]),
    );
    expect(validateMove(s, 'A', mv(2, 1, 2, 6))).toBe('path_blocked');
  });

  it('não pula peças', () => {
    const s = soldierState();
    expect(validateMove(s, 'A', mv(0, 0, 4, 0))).toBe('path_blocked');
  });

  it('andou mais de 1 casa: não pode atacar', () => {
    const s = soldierState();
    expect(validateMove(s, 'A', mv(0, 0, 0, 9))).toBe('soldier_cannot_attack_after_running');
    expect(getLegalMoves(s, 'A').some((m) => m.to.y === 9)).toBe(false);
  });

  it('pode atacar andando 1 casa', () => {
    const s = makeState([
      { x: 0, y: 8, owner: 'A', rank: 'soldado' },
      { x: 0, y: 9, owner: 'B', rank: 'cabo' },
      { x: 9, y: 9, owner: 'B', rank: 'sargento' },
      { x: 9, y: 0, owner: 'A', rank: 'sargento' },
    ]);
    expect(validateMove(s, 'A', mv(0, 8, 0, 9))).toBeNull();
    const { record } = applyMove(s, mv(0, 8, 0, 9));
    expect(record.combat?.outcome).toBe('defender_wins');
  });

  it('andar mais de 1 casa revela publicamente como Soldado; 1 casa não revela', () => {
    const s = soldierState();
    const far = applyMove(s, mv(0, 0, 0, 5));
    expect(far.state.board[toIndex({ x: 0, y: 5 })]).toMatchObject({
      rank: 'soldado',
      revealed: true,
    });
    expect(far.record.distance).toBe(5);
    const near = applyMove(s, mv(0, 0, 0, 1));
    expect(near.state.board[toIndex({ x: 0, y: 1 })]).toMatchObject({ revealed: false });
  });

  it('demais peças não andam mais de 1 casa', () => {
    const s = makeState([
      { x: 0, y: 0, owner: 'A', rank: 'general' },
      { x: 9, y: 9, owner: 'B', rank: 'sargento' },
    ]);
    expect(validateMove(s, 'A', mv(0, 0, 0, 2))).toBe('too_far');
  });
});

describe('regra das 3 rodadas (vai-e-volta)', () => {
  // B alterna duas peças, então B nunca bate no próprio limite.
  const B_MOVES = [mv(9, 9, 9, 8), mv(8, 9, 8, 8), mv(9, 8, 9, 9), mv(8, 8, 8, 9)];
  let bTurn = 0;
  const b = () => B_MOVES[bTurn++ % B_MOVES.length]!;

  function repState(): GameState {
    bTurn = 0;
    return makeState([
      { x: 0, y: 0, owner: 'A', rank: 'tenente' },
      { x: 5, y: 0, owner: 'A', rank: 'soldado' },
      { x: 9, y: 9, owner: 'B', rank: 'sargento' },
      { x: 8, y: 9, owner: 'B', rank: 'sargento' },
    ]);
  }

  it('3 idas e voltas seguidas são permitidas; a 4ª é ilegal', () => {
    let s = repState();
    s = play(s, mv(0, 0, 0, 1), b(), mv(0, 1, 0, 0), b(), mv(0, 0, 0, 1), b());
    expect(s.repetition.A).toMatchObject({ pieceId: 'A00', count: 3 });
    expect(validateMove(s, 'A', mv(0, 1, 0, 0))).toBe('repetition_limit');
    expect(getLegalMoves(s, 'A').map(moveKey)).not.toContain(moveKey(mv(0, 1, 0, 0)));
    expect(() => applyMove(s, mv(0, 1, 0, 0))).toThrow(/repetition_limit/);
    // Outras jogadas da mesma peça continuam válidas.
    expect(validateMove(s, 'A', mv(0, 1, 0, 2))).toBeNull();
  });

  it('mover outra peça zera o contador', () => {
    let s = repState();
    s = play(s, mv(0, 0, 0, 1), b(), mv(0, 1, 0, 0), b(), mv(0, 0, 0, 1), b());
    s = play(s, mv(5, 0, 5, 1), b());
    expect(s.repetition.A).toMatchObject({ pieceId: 'A05', count: 1 });
    expect(validateMove(s, 'A', mv(0, 1, 0, 0))).toBeNull();
  });

  it('a peça fazer outro movimento zera o contador', () => {
    let s = repState();
    s = play(s, mv(0, 0, 0, 1), b(), mv(0, 1, 0, 0), b(), mv(0, 0, 0, 1), b());
    s = play(s, mv(0, 1, 1, 1), b());
    expect(s.repetition.A).toMatchObject({ count: 1 });
    s = play(s, mv(1, 1, 0, 1), b(), mv(0, 1, 0, 0), b());
    // (0,1)<->(0,0) recomeçou do zero: 1 jogada, então ainda pode ir e voltar.
    expect(s.repetition.A).toMatchObject({ count: 1 });
    expect(validateMove(s, 'A', mv(0, 0, 0, 1))).toBeNull();
  });

  it('jogadas do adversário não zeram o contador', () => {
    let s = repState();
    s = play(s, mv(0, 0, 0, 1), b(), mv(0, 1, 0, 0), b());
    expect(s.repetition.A?.count).toBe(2);
    expect(s.repetition.B?.count).toBe(1);
  });

  it('vale para o Soldado andando várias casas entre as mesmas duas casas', () => {
    let s = repState();
    s = play(s, mv(5, 0, 5, 3), b(), mv(5, 3, 5, 0), b(), mv(5, 0, 5, 3), b());
    expect(validateMove(s, 'A', mv(5, 3, 5, 0))).toBe('repetition_limit');
    expect(validateMove(s, 'A', mv(5, 3, 5, 1))).toBeNull();
  });

  it('ataque não é vai-e-volta: é permitido e zera o contador', () => {
    let s = makeState([
      { x: 0, y: 0, owner: 'A', rank: 'tenente' },
      { x: 1, y: 0, owner: 'B', rank: 'soldado' },
      { x: 9, y: 9, owner: 'B', rank: 'sargento' },
      { x: 8, y: 9, owner: 'B', rank: 'sargento' },
    ]);
    s = play(s, mv(0, 0, 0, 1), mv(9, 9, 9, 8), mv(0, 1, 0, 0), mv(8, 9, 8, 8), mv(0, 0, 0, 1));
    expect(s.repetition.A?.count).toBe(3);
    // B entra na casa (0,0); voltar para lá agora é um ataque.
    s = play(s, mv(1, 0, 0, 0));
    expect(validateMove(s, 'A', mv(0, 1, 0, 0))).toBeNull();
    const after = applyMove(s, mv(0, 1, 0, 0)).state;
    expect(after.repetition.A).toBeNull();
    expect(after.lost.B).toEqual(['soldado']);
  });

  it('se o único movimento é o 4º vai-e-volta, o jogador fica sem jogadas e perde', () => {
    bTurn = 0;
    let s = makeState([
      { x: 0, y: 0, owner: 'A', rank: 'tenente' },
      { x: 1, y: 0, owner: 'A', rank: 'mina' },
      { x: 1, y: 1, owner: 'A', rank: 'mina' },
      { x: 0, y: 2, owner: 'A', rank: 'mina' },
      { x: 9, y: 9, owner: 'B', rank: 'sargento' },
      { x: 8, y: 9, owner: 'B', rank: 'sargento' },
    ]);
    s = play(s, mv(0, 0, 0, 1), b(), mv(0, 1, 0, 0), b(), mv(0, 0, 0, 1));
    expect(s.phase).toBe('playing');
    s = play(s, b());
    expect(s.phase).toBe('finished');
    expect(s.result).toEqual({ winner: 'B', reason: 'no_legal_moves' });
  });
});

describe('consistência: geração x validação', () => {
  it('em partidas aleatórias, as jogadas geradas são exatamente as que validam', () => {
    let checked = 0;
    for (const seed of [11, 12]) {
      playRandomGame(
        seed,
        (state) => {
          if (state.phase !== 'playing' || state.ply % 25 !== 0) return;
          const player = state.turn!;
          const generated = new Set(getLegalMoves(state, player).map(moveKey));
          const brute = new Set<string>();
          for (let f = 0; f < 100; f++) {
            if (state.board[f]?.owner !== player) continue;
            for (let t = 0; t < 100; t++) {
              const m = mv(f % 10, Math.floor(f / 10), t % 10, Math.floor(t / 10));
              if (checkMove(state.board, player, state.repetition[player], m) === null)
                brute.add(moveKey(m));
            }
          }
          expect(generated).toEqual(brute);
          expect(generateMoves(state.board, player, state.repetition[player]).length).toBe(
            generated.size,
          );
          checked++;
        },
        600,
      );
    }
    expect(checked).toBeGreaterThan(5);
  });
});
