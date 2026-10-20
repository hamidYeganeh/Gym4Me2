import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { routeIntegrator } from "../../../packages/ui/src/lib/route-integrator";
import { RouteAnimation } from "../../../packages/ui/src/lib/route-animation";
import { routeMotion } from "../../../packages/ui/src/lib/route-motion";
const { WebAnimation, MultiAnimation } = createRequire(
  new URL("../../../packages/ui/package.json", import.meta.url),
)("@ssgoi/react");

for (const [name, duration] of Object.entries(routeMotion)) {
  test(`${name} has the approved duration through the installed SSGOI playback engine`, () => {
    let durationMs = 0;
    const handle = { currentTime: 0, playbackRate: 1, cancel() {}, play() {} };
    const element = {
      style: {},
      animate(_frames: unknown, options: { duration: number }) {
        durationMs = options.duration;
        return handle;
      },
    } as unknown as HTMLElement;
    const track = new WebAnimation({
      element,
      integrator: routeIntegrator(duration),
      style: (progress: number) => ({ opacity: progress }),
    });
    const animation = new RouteAnimation(new MultiAnimation({ track }), duration);
    // The real route controller overwrites the factory's speed before playing.
    animation.playbackRate = 1;
    animation.play();
    assert.ok(
      Math.abs(durationMs / handle.playbackRate - duration * 1000) < 0.01,
    );
    animation.playbackRate = 0.5;
    assert.ok(
      Math.abs(durationMs / handle.playbackRate - duration * 2000) < 0.01,
    );
    animation.complete();
  });
  test(`${name} reaches its endpoint within one display frame of its duration`, () => {
    for (const hz of [60, 90, 120]) {
      const integrator = routeIntegrator(duration);
      let state = { position: 0, velocity: 0 },
        frames = 0;
      while (!integrator.isSettled(state, 1) && frames < 1000) {
        state = integrator.step(state, 1, 1 / hz);
        frames++;
      }
      assert.ok(frames / hz >= duration - 1e-9);
      assert.ok(frames / hz <= duration + 1 / hz + 1e-9);
      assert.ok(state.position <= 1);
    }
  });
}
test("reversal keeps speed and settles at the opposite endpoint without overshoot", () => {
  const integrator = routeIntegrator(0.22);
  let state = integrator.step({ position: 0, velocity: 0 }, 1, 0.1);
  assert.ok(state.position > 0 && state.position < 1);
  state = integrator.step(state, 0, 0.05);
  assert.ok(state.position > 0 && state.velocity < 0);
  state = integrator.step(state, 0, 0.06);
  assert.deepEqual(state, { position: 0, velocity: 0 });
});
test("reduced motion finishes in the first frame without simulation travel", () => {
  assert.deepEqual(
    routeIntegrator(0).step({ position: 0.4, velocity: 3 }, 1, 0),
    {
      position: 1,
      velocity: 0,
    },
  );
});
