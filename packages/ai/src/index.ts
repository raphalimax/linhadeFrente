import { recruta } from './recruta';
import type { Bot, Difficulty } from './types';

export * from './types';
export { recruta, recrutaWeight } from './recruta';

export const DIFFICULTIES: readonly { id: Difficulty; label: string; available: boolean }[] = [
  { id: 'recruta', label: 'Recruta', available: true },
  { id: 'sargento', label: 'Sargento', available: false },
  { id: 'general', label: 'General', available: false },
];

/** Bot de cada dificuldade. Enquanto Sargento e General não existem, usam a Recruta. */
export function getBot(difficulty: Difficulty): Bot {
  switch (difficulty) {
    case 'recruta':
    case 'sargento':
    case 'general':
      return recruta;
  }
}
