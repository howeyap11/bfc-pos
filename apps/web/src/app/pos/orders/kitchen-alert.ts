/** Short two-tone chime for new kitchen tickets (no external assets; works offline). */
export function playKitchenNewOrderChime() {
  if (typeof window === "undefined") return;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.value = 0.12;

    function playTone(freq: number, start: number, dur: number) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(start);
      osc.stop(start + dur);
    }

    const t0 = ctx.currentTime + 0.02;
    playTone(880, t0, 0.12);
    playTone(1174.66, t0 + 0.14, 0.14);

    ctx.resume?.().catch(() => {});
    window.setTimeout(() => {
      try {
        ctx.close();
      } catch {
        /* ignore */
      }
    }, 600);
  } catch {
    /* ignore */
  }
}
