/** Fixed wall-clock duration for normalized route progress, including reversal. */
export function routeIntegrator(durationSec: number) {
  return {
    step(
      state: { position: number; velocity: number },
      target: number,
      dt: number,
    ) {
      const remaining = target - state.position;
      const distance =
        durationSec > 0 ? Math.max(0, dt) / durationSec : Infinity;
      if (Math.abs(remaining) <= distance)
        return { position: target, velocity: 0 };
      const velocity = Math.sign(remaining) / durationSec;
      return {
        position: state.position + velocity * Math.max(0, dt),
        velocity,
      };
    },
    isSettled(state: { position: number }, target: number) {
      return Math.abs(state.position - target) < 1e-9;
    },
  };
}

/** SSGOI 7.4 simulates at 60Hz and retains two settled frames. */
export function routePlaybackRate(durationSec: number) {
  return durationSec > 0
    ? (Math.ceil(durationSec * 60 - 1e-9) + 2) / (60 * durationSec)
    : 1;
}
