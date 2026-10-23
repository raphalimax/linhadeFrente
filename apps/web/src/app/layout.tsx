import type { Metadata, Viewport } from 'next';
import { Press_Start_2P, VT323 } from 'next/font/google';
import './globals.css';

// Fontes pixel com licença OFL.
const pixel = Press_Start_2P({ weight: '400', subsets: ['latin'], variable: '--font-pixel' });
const body = VT323({ weight: '400', subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'Linha de Frente',
  description: 'Estratégia com informação oculta para 2 jogadores.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1f2a1a',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR" className={`${pixel.variable} ${body.variable} h-full antialiased`}>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
