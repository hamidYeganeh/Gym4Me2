/**
 * Request-triggered maintenance in a serverless process. Reads share one bounded
 * pass per freshness window; successful commands always get a pass after commit.
 * Only scheduling state is retained: never principals, request bodies or results.
 */
export class RequestDueWork {
  private running: Promise<void> | undefined;
  private afterCommand: Promise<void> | undefined;
  private readFreshUntil = 0;

  constructor(
    private readonly drain: () => Promise<void>,
    private readonly now: () => number = Date.now,
    private readonly readFreshnessMs = 5000,
  ) {}

  run(mode: 'read' | 'command'): Promise<void> {
    if (this.running) {
      if (mode === 'read') return this.running;
      // A running pass may already have taken its snapshot before the command
      // committed. Coalesce commands into one following pass, never skip it.
      if (!this.afterCommand) {
        this.afterCommand = this.running
          .catch(() => undefined)
          .then(() => {
            this.afterCommand = undefined;
            return this.start();
          });
      }
      return this.afterCommand;
    }
    if (mode === 'read' && this.now() < this.readFreshUntil)
      return Promise.resolve();
    return this.start();
  }

  private start(): Promise<void> {
    const pass = Promise.resolve()
      .then(() => this.drain())
      .then(() => {
        this.readFreshUntil = this.now() + this.readFreshnessMs;
      })
      .finally(() => {
        if (this.running === pass) this.running = undefined;
      });
    this.running = pass;
    return pass;
  }
}
