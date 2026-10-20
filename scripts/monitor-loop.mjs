export function transition(
  previous = { status: "unknown", failures: 0, successes: 0 },
  healthy,
  now = new Date().toISOString(),
) {
  const next = {
    ...previous,
    failures: healthy ? 0 : previous.failures + 1,
    successes: healthy ? previous.successes + 1 : 0,
    checkedAt: now,
  };
  let event;
  if (!healthy && next.failures >= 3 && previous.status !== "down") {
    next.status = "down";
    next.downSince = now;
    event = { type: "incident", at: now };
  } else if (healthy && next.successes >= 2 && previous.status !== "up") {
    next.status = "up";
    delete next.downSince;
    event = {
      type: previous.status === "down" ? "recovered" : "healthy",
      at: now,
    };
  }
  return { next, event };
}

/** Publish synchronously persists health and enqueues events before delivery. */
export function createMonitorScheduler({
  check,
  publish,
  deliver,
  clock = Date.now,
  onError = () => {},
}) {
  const controller = new AbortController();
  const states = {};
  let stopped = false,
    fatal,
    checking,
    delivering,
    requested = 0,
    completed = 0,
    health,
    snapshot,
    alertDelivery = { running: false };
  const timestamp = () => new Date(clock()).toISOString();
  function stop() {
    stopped = true;
    controller.abort();
  }
  function fail(error) {
    if (stopped) return;
    fatal = error;
    stop();
    onError(error);
  }
  function persist(events = []) {
    if (stopped || !health) return;
    const next = {
      ...health,
      states: { ...states },
      alertDelivery: { ...alertDelivery },
    };
    publish(next, events);
    snapshot = next;
    return next;
  }
  function startDelivery() {
    if (delivering || stopped) return;
    delivering = Promise.resolve()
      .then(async () => {
        while (!stopped && completed < requested) {
          const generation = requested;
          const startedAt = timestamp();
          alertDelivery = { ...alertDelivery, running: true, startedAt };
          persist();
          const result = await deliver(controller.signal);
          if (stopped) return;
          completed = generation;
          alertDelivery = {
            ...result,
            running: false,
            startedAt,
            completedAt: timestamp(),
          };
          // A delivery may finish after newer probes; retain their health.
          persist();
        }
      })
      .catch(fail)
      .finally(() => {
        delivering = undefined;
        // A check can publish after the loop exits but before this finalizer.
        if (!stopped && completed < requested) startDelivery();
      });
  }
  function requestDelivery() {
    requested++;
    startDelivery();
  }
  function tick() {
    if (fatal) throw fatal;
    if (stopped) return Promise.resolve();
    if (checking) return checking;
    checking = Promise.resolve()
      .then(async () => {
        if (stopped) return;
        const results = await check(controller.signal);
        if (stopped) return;
        const checkedAt = timestamp();
        const events = [];
        for (const [service, healthy] of results) {
          const { next, event } = transition(
            states[service],
            healthy,
            checkedAt,
          );
          states[service] = next;
          if (event) events.push({ service, ...event });
        }
        health = { checkedAt, results: Object.fromEntries(results) };
        const current = persist(events);
        requestDelivery();
        return current;
      })
      .catch(fail)
      .finally(() => {
        checking = undefined;
      });
    return checking;
  }
  async function drain() {
    // New checks during delivery coalesce into one following pass.
    while (checking || delivering)
      await Promise.all([checking, delivering].filter(Boolean));
    if (fatal) throw fatal;
    return snapshot;
  }
  return {
    tick,
    async once() {
      await tick();
      return drain();
    },
    stop,
    drain,
  };
}
