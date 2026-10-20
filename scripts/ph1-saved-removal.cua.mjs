// Run only through cua_repl against a disposable guest/account fixture.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

/** Exercise rendered rows, async replacement and the empty action through the public UI. */
export async function checkSavedRemoval({
  tab,
  artifactDir,
  name,
  fromEnd = false,
}) {
  const selector = "button[data-saved-id]";
  await tab.playwright
    .locator(selector)
    .first()
    .waitFor({ state: "visible", timeoutMs: 15000 });
  const ids = await tab.playwright.evaluate(() =>
    [...document.querySelectorAll("button[data-saved-id]")].map((button) =>
      button.getAttribute("data-saved-id"),
    ),
  );
  assert.ok(
    ids.length >= 2,
    "Seed at least two disposable saved clubs before this check",
  );
  const records = [];
  for (let index = 0; index < ids.length; index++) {
    const removed = fromEnd ? ids[ids.length - 1 - index] : ids[index];
    const remaining = fromEnd
      ? ids.slice(0, ids.length - 1 - index)
      : ids.slice(index + 1);
    const next = fromEnd ? remaining[remaining.length - 1] : remaining[0];
    let inputObservationTimedOut = false;
    try {
      await tab.playwright
        .locator(`button[data-saved-id=${JSON.stringify(removed)}]`)
        .press("Enter");
    } catch (error) {
      // The control can unmount before this driver's key-up observation completes.
      // Never repeat the input: the detached/remaining/focus assertions below decide success.
      if (
        !String(error).includes(
          'Timed out running CDP command "Input.dispatchKeyEvent"',
        )
      )
        throw error;
      inputObservationTimedOut = true;
    }
    await tab.playwright
      .locator(`button[data-saved-id=${JSON.stringify(removed)}]`)
      .waitFor({ state: "detached", timeoutMs: 15000 });
    await tab.playwright
      .locator(
        next
          ? `button[data-saved-id=${JSON.stringify(next)}]`
          : "[data-saved-empty]",
      )
      .waitFor({ state: "visible", timeoutMs: 15000 });
    await tab.getAXState({ emit: false });
    const result = await tab.playwright.evaluate(() => ({
      path: location.pathname + location.search,
      remaining: [...document.querySelectorAll("button[data-saved-id]")].map(
        (button) => button.getAttribute("data-saved-id"),
      ),
      focus: {
        id: document.activeElement?.getAttribute("data-saved-id"),
        empty: document.activeElement?.hasAttribute("data-saved-empty"),
        tag: document.activeElement?.tagName,
        href: document.activeElement?.getAttribute("href"),
      },
      busy: !!document.querySelector('main [aria-busy="true"]'),
    }));
    assert.deepEqual(result.remaining, remaining);
    assert.equal(result.busy, false);
    if (next) assert.equal(result.focus.id, next);
    else {
      assert.equal(result.focus.empty, true);
      assert.equal(result.focus.href, "/discovery");
    }
    records.push({ ...result, inputObservationTimedOut });
  }
  await writeFile(
    `${artifactDir}/${name}.json`,
    JSON.stringify(records, null, 2) + "\n",
  );
  await writeFile(
    `${artifactDir}/${name}.jpg`,
    await tab.getScreenshot({ emit: false }),
  );
  return records;
}
