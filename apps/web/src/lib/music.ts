'use client';

import { runningContext } from './audio';

/**
 * Marcha militar de fundo, composta para o jogo e sintetizada em tempo real:
 * caixa, bumbo, baixo e uma "corneta" (dente de serra filtrado), em ré menor.
 * 8 compassos em loop, agendados alguns décimos de segundo à frente.
 */

const BPM = 108;
const STEP = 60 / BPM / 4; // semicolcheia
const STEPS_PER_BAR = 16;
const BARS = 8;
const LOOKAHEAD_S = 0.3;
const TICK_MS = 60;
const VOLUME = 0.55;

// Frequências (Hz)
const N = {
  A2: 110,
  C2: 65.41,
  D2: 73.42,
  E2: 82.41,
  F2: 87.31,
  G2: 98,
  A3: 220,
  C3: 130.81,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392,
  A4: 440,
  Bb4: 466.16,
  C5: 523.25,
  D5: 587.33,
  E5: 659.26,
} as const;

type Note = [step: number, freq: number, length: number];

/** Melodia: [passo no compasso, nota, duração em passos]. */
const MELODY: Note[][] = [
  [
    [0, N.D4, 2],
    [2, N.D4, 1],
    [3, N.D4, 1],
    [4, N.A4, 4],
    [8, N.F4, 2],
    [10, N.A4, 2],
    [12, N.D5, 4],
  ],
  [
    [0, N.C5, 3],
    [3, N.A4, 1],
    [4, N.Bb4, 2],
    [6, N.A4, 2],
    [8, N.G4, 4],
    [12, N.A4, 4],
  ],
  [
    [0, N.D4, 2],
    [2, N.D4, 1],
    [3, N.D4, 1],
    [4, N.A4, 4],
    [8, N.F4, 2],
    [10, N.A4, 2],
    [12, N.D5, 4],
  ],
  [
    [0, N.E5, 3],
    [3, N.D5, 1],
    [4, N.C5, 2],
    [6, N.A4, 2],
    [8, N.D5, 8],
  ],
  [
    [0, N.F4, 2],
    [2, N.A4, 2],
    [4, N.C5, 4],
    [8, N.Bb4, 2],
    [10, N.A4, 2],
    [12, N.G4, 4],
  ],
  [
    [0, N.E4, 2],
    [2, N.G4, 2],
    [4, N.Bb4, 4],
    [8, N.A4, 2],
    [10, N.G4, 2],
    [12, N.F4, 4],
  ],
  [
    [0, N.D4, 2],
    [2, N.F4, 2],
    [4, N.A4, 2],
    [6, N.D5, 2],
    [8, N.C5, 2],
    [10, N.A4, 2],
    [12, N.E4, 4],
  ],
  [
    [0, N.D4, 2],
    [2, N.A3, 2],
    [4, N.D4, 4],
  ],
];

/** Baixo: [fundamental, quinta] de cada compasso, alternando nos tempos. */
const BASS: [number, number][] = [
  [N.D2, N.A2],
  [N.A2, N.E2],
  [N.D2, N.A2],
  [N.A2, N.E2],
  [N.F2, N.C3],
  [N.C2, N.G2],
  [N.D2, N.A2],
  [N.D2, N.A2],
];

/** Caixa: passo → intensidade. Último compasso termina num rufar. */
const SNARE: Record<number, number> = { 4: 1, 12: 1, 14: 0.4, 15: 0.5 };
const SNARE_ROLL: Record<number, number> = {
  4: 1,
  8: 0.5,
  9: 0.55,
  10: 0.6,
  11: 0.65,
  12: 0.7,
  13: 0.8,
  14: 0.9,
  15: 1,
};

let timer: ReturnType<typeof setInterval> | null = null;
let bus: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let nextTime = 0;
let step = 0;

function noise(ac: AudioContext): AudioBuffer {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ac.sampleRate) {
    noiseBuffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * 0.25), ac.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

function envelope(
  ac: AudioContext,
  t: number,
  peak: number,
  dur: number,
  out: AudioNode,
): GainNode {
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(out);
  return g;
}

function snare(ac: AudioContext, t: number, vel: number, out: AudioNode) {
  const src = ac.createBufferSource();
  src.buffer = noise(ac);
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1800;
  src.connect(hp).connect(envelope(ac, t, 0.16 * vel, 0.11, out));
  src.start(t);
  src.stop(t + 0.12);
}

function kick(ac: AudioContext, t: number, out: AudioNode) {
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(110, t);
  osc.frequency.exponentialRampToValueAtTime(42, t + 0.14);
  osc.connect(envelope(ac, t, 0.4, 0.2, out));
  osc.start(t);
  osc.stop(t + 0.22);
}

function bass(ac: AudioContext, t: number, freq: number, out: AudioNode) {
  const osc = ac.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  osc.connect(envelope(ac, t, 0.22, STEP * 3.5, out));
  osc.start(t);
  osc.stop(t + STEP * 4);
}

function bugle(ac: AudioContext, t: number, freq: number, len: number, out: AudioNode) {
  const dur = len * STEP * 0.92;
  const osc = ac.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = freq;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(900, t);
  lp.frequency.linearRampToValueAtTime(2200, t + 0.04);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.07, t + 0.02);
  g.gain.setValueAtTime(0.06, t + Math.max(0.03, dur - 0.04));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(lp).connect(g).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function scheduleStep(ac: AudioContext, s: number, t: number, out: AudioNode) {
  const bar = Math.floor(s / STEPS_PER_BAR);
  const pos = s % STEPS_PER_BAR;
  if (pos === 0 || pos === 8) kick(ac, t, out);
  const vel = (bar === BARS - 1 ? SNARE_ROLL : SNARE)[pos];
  if (vel) snare(ac, t, vel, out);
  if (pos % 4 === 0) {
    const [root, fifth] = BASS[bar]!;
    bass(ac, t, pos % 8 === 0 ? root : fifth, out);
  }
  for (const [at, freq, len] of MELODY[bar]!) if (at === pos) bugle(ac, t, freq, len, out);
}

function tick() {
  const ac = runningContext();
  if (!ac || !bus) return;
  // Se a aba ficou parada, não tenta "alcançar" o tempo perdido.
  if (nextTime < ac.currentTime) nextTime = ac.currentTime + 0.05;
  while (nextTime < ac.currentTime + LOOKAHEAD_S) {
    scheduleStep(ac, step, nextTime, bus);
    nextTime += STEP;
    step = (step + 1) % (STEPS_PER_BAR * BARS);
  }
}

export function isMusicPlaying(): boolean {
  return timer !== null;
}

/** Começa a música (só funciona depois que o áudio foi destravado). */
export function startMusic(): boolean {
  if (timer) return true;
  const ac = runningContext();
  if (!ac) return false;
  bus = ac.createGain();
  bus.gain.setValueAtTime(0.0001, ac.currentTime);
  bus.gain.exponentialRampToValueAtTime(VOLUME, ac.currentTime + 1.5);
  bus.connect(ac.destination);
  nextTime = ac.currentTime + 0.1;
  step = 0;
  timer = setInterval(tick, TICK_MS);
  tick();
  return true;
}

export function stopMusic() {
  if (timer) clearInterval(timer);
  timer = null;
  const ac = runningContext();
  const old = bus;
  bus = null;
  if (old && ac) {
    old.gain.cancelScheduledValues(ac.currentTime);
    old.gain.setValueAtTime(old.gain.value, ac.currentTime);
    old.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.4);
    setTimeout(() => old.disconnect(), 500);
  } else {
    old?.disconnect();
  }
}
