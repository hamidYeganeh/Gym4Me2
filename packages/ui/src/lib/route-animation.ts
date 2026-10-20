import { MultiAnimation } from "@ssgoi/react";
import { routePlaybackRate } from "./route-integrator";

/** Preserve duration correction when SSGOI applies its controller's playback speed. */
export class RouteAnimation extends MultiAnimation {
  private readonly correction: number;

  constructor(animation: MultiAnimation, durationSec: number) {
    super({ route: animation });
    this.correction = routePlaybackRate(durationSec);
    this.playbackRate = 1;
  }

  override get playbackRate() {
    return super.playbackRate / this.correction;
  }

  override set playbackRate(speed: number) {
    super.playbackRate = speed * this.correction;
  }
}
