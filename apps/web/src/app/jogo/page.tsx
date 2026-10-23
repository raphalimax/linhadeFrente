import type { Metadata } from 'next';
import { GameRoot } from '@/components/GameRoot';

export const metadata: Metadata = { title: 'Partida · Linha de Frente' };

export default function JogoPage() {
  return <GameRoot />;
}
