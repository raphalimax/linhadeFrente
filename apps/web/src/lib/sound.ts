'use client';

import { useSettings } from '@/store/settings';
import { runningContext } from './audio';

/**
 * Efeitos sonoros sintetizados com Web Audio (estilo 8 bits), sem arquivos.
 * Tudo é silencioso se o jogador desligou o som ou o navegador não suporta.
 */

function audio(): AudioContext | null {
  if (useSettings.getState().muted) return null;
  return runningContext();
}

interface ToneOptions {
  freq: number;
  /** Frequência final (glissando). */
  to?: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  /** Atraso em segundos. */
  at?: number;
}

function tone(
  ac: AudioContext,
  { freq, to, dur, type = 'square', gain = 0.08, at = 0 }: ToneOptions,
) {
  const t0 = ac.currentTime + at;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  amp.gain.setValueAtTime(gain, t0);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(ac: AudioContext, dur: number, { gain = 0.25, at = 0, cutoff = 1200 } = {}) {
  const t0 = ac.currentTime + at;
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(cutoff, t0);
  filter.frequency.exponentialRampToValueAtTime(80, t0 + dur);
  const amp = ac.createGain();
  amp.gain.setValueAtTime(gain, t0);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(amp).connect(ac.destination);
  src.start(t0);
}

function vibrate(pattern: number | number[]) {
  if (useSettings.getState().muted) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // sem suporte
  }
}

export const sfx = {
  select() {
    const ac = audio();
    if (ac) tone(ac, { freq: 880, dur: 0.05, gain: 0.04 });
  },
  move() {
    const ac = audio();
    if (ac) tone(ac, { freq: 220, to: 140, dur: 0.09, type: 'triangle', gain: 0.18 });
  },
  clash() {
    const ac = audio();
    if (!ac) return;
    noise(ac, 0.12, { gain: 0.18, cutoff: 3000 });
    tone(ac, { freq: 330, to: 110, dur: 0.15, gain: 0.06 });
    vibrate(40);
  },
  win() {
    const ac = audio();
    if (!ac) return;
    tone(ac, { freq: 523, dur: 0.09 });
    tone(ac, { freq: 784, dur: 0.14, at: 0.09 });
  },
  lose() {
    const ac = audio();
    if (!ac) return;
    tone(ac, { freq: 392, dur: 0.1 });
    tone(ac, { freq: 196, dur: 0.2, at: 0.1 });
  },
  explosion() {
    const ac = audio();
    if (!ac) return;
    noise(ac, 0.6, { gain: 0.4, cutoff: 900 });
    tone(ac, { freq: 90, to: 40, dur: 0.5, type: 'sine', gain: 0.3 });
    vibrate([60, 30, 120]);
  },
  victory() {
    const ac = audio();
    if (!ac) return;
    [523, 659, 784, 1047].forEach((freq, i) => tone(ac, { freq, dur: 0.16, at: i * 0.13 }));
  },
  defeat() {
    const ac = audio();
    if (!ac) return;
    [392, 330, 262, 196].forEach((freq, i) =>
      tone(ac, { freq, dur: 0.22, at: i * 0.18, type: 'triangle', gain: 0.15 }),
    );
  },
};
