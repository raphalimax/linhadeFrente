'use client';

/**
 * Contexto de áudio compartilhado pelos efeitos sonoros.
 *
 * Celulares só liberam o áudio dentro de um toque do usuário, e o iPhone
 * silencia Web Audio com a chave de silencioso ligada. Por isso o áudio é
 * "destravado" a cada toque: retoma o contexto, toca um buffer mudo e pede ao
 * iOS (17+) a sessão de "playback".
 */

type AudioCtor = typeof AudioContext;

let ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const Ctor: AudioCtor | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
    if (!Ctor) return null;
    ctx ??= new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

/** Contexto pronto para tocar agora (ou `null`). */
export function runningContext(): AudioContext | null {
  const ac = getAudioContext();
  return ac && ac.state === 'running' ? ac : null;
}

function unlock(onReady: () => void) {
  const ac = getAudioContext();
  if (!ac) return;
  try {
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session) session.type = 'playback';
  } catch {
    // API indisponível
  }
  try {
    const src = ac.createBufferSource();
    src.buffer = ac.createBuffer(1, 1, 22050);
    src.connect(ac.destination);
    src.start(0);
  } catch {
    // ignora
  }
  if (ac.state === 'running') onReady();
  else void ac.resume().then(onReady, () => {});
}

const GESTURES = ['pointerdown', 'touchend', 'keydown'] as const;

/** Destrava o áudio a cada gesto do usuário. Devolve a função de limpeza. */
export function installAudioUnlock(onReady: () => void): () => void {
  const handler = () => unlock(onReady);
  for (const e of GESTURES) window.addEventListener(e, handler, { capture: true, passive: true });
  return () => {
    for (const e of GESTURES) window.removeEventListener(e, handler, { capture: true });
  };
}
