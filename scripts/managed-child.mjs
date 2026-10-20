import { spawn } from "node:child_process";

/** Own one process group, escalate cancellation, and settle only after its pipes close. */
export function spawnManaged(
  command,
  args,
  options = {},
  { signal, timeoutMs, graceMs = 5000 } = {},
) {
  signal?.throwIfAborted();
  const grouped = process.platform !== "win32";
  const child = spawn(command, args, { ...options, detached: grouped });
  let closed = false,
    settled = false,
    cancelling = false,
    reapingExpired = false,
    failure,
    escalation,
    deadline,
    polling,
    reaping,
    result,
    settle;
  const groupAlive = () => {
    if (!grouped || !child.pid) return false;
    try {
      process.kill(-child.pid, 0);
      return true;
    } catch (error) {
      return error.code !== "ESRCH";
    }
  };
  const finish = () => {
    if (settled || !closed || (cancelling && groupAlive() && !reapingExpired))
      return;
    settled = true;
    clearTimeout(deadline);
    clearTimeout(escalation);
    clearTimeout(reaping);
    clearInterval(polling);
    signal?.removeEventListener("abort", aborted);
    settle();
  };
  const kill = (name) => {
    if (settled || !child.pid || (!grouped && closed)) return;
    try {
      if (grouped) process.kill(-child.pid, name);
      else child.kill(name);
    } catch (error) {
      if (error.code !== "ESRCH") failure ??= error;
    }
  };
  const cancel = (reason = new Error("Managed child cancelled.")) => {
    if (settled || cancelling) return;
    cancelling = true;
    failure ??= reason;
    kill("SIGTERM");
    // The group can outlive its leader, especially when descendants ignore stdio.
    polling = setInterval(finish, 20);
    escalation = setTimeout(() => {
      kill("SIGKILL");
      // Reap briefly; a dead orphan may remain a zombie under the host's init.
      reaping = setTimeout(() => {
        reapingExpired = true;
        finish();
      }, 1000);
      finish();
    }, graceMs);
  };
  const aborted = () => cancel(signal.reason);
  const completed = new Promise((resolve, reject) => {
    settle = () => (failure ? reject(failure) : resolve(result));
    child.once("error", (error) => {
      failure ??= error;
    });
    child.once("close", (code, exitSignal) => {
      closed = true;
      result = { code, signal: exitSignal };
      finish();
    });
  });
  // A stream consumer may observe spawn failure before it starts awaiting completion.
  void completed.catch(() => {});
  signal?.addEventListener("abort", aborted, { once: true });
  if (signal?.aborted) aborted();
  if (timeoutMs !== undefined)
    deadline = setTimeout(
      () => cancel(new Error("Managed child timed out.")),
      timeoutMs,
    );
  return {
    child,
    completed,
    stop(reason) {
      cancel(reason);
      return completed;
    },
  };
}
