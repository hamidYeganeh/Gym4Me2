import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { connectSessionSync } from "../src/session-sync";

test("a second tab receives an opaque reset without notifying its own sender or another API/client", async () => {
  const base = `/api/${randomUUID()}`;
  let sender = 0,
    otherClient = 0,
    otherApi = 0;
  let receive!: () => void;
  const message = new Promise<void>((resolve) => {
    receive = resolve;
  });
  const first = connectSessionSync("business", base, () => sender++);
  const second = connectSessionSync("business", base, receive);
  const admin = connectSessionSync("admin", base, () => otherClient++);
  const remote = connectSessionSync(
    "business",
    `${base}/other`,
    () => otherApi++,
  );
  const observer = new BroadcastChannel(`gym4me:session:business:${base}`);
  const payload = new Promise<unknown>((resolve) => {
    observer.onmessage = (event) => resolve(event.data);
  });
  try {
    first.publish();
    await Promise.race([
      message,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Session reset not received")),
          2000,
        ).unref(),
      ),
    ]);
    assert.equal(await payload, "reset");
    assert.equal(sender, 0);
    assert.equal(otherClient, 0);
    assert.equal(otherApi, 0);
    second.close();
    first.publish();
    assert.equal(sender, 0);
  } finally {
    first.close();
    second.close();
    admin.close();
    remote.close();
    observer.close();
  }
});
