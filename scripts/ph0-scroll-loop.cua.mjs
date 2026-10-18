/** Browser regression seam: pass an existing CUA tab on /discovery.
 * Requires the read-only protected-catalog fixture and 1280×720 viewport.
 * Does not acquire a browser or start any server.
 */
export async function tabScrollRegression(
  tab,
  { scrollImmediately = false } = {},
) {
  const stableScroll = async () => {
    let last = null,
      same = 0;
    for (let attempt = 0; attempt < 30; attempt++) {
      const current = await tab.playwright.evaluate(() => ({
        path: location.pathname,
        scrollY,
        max: document.documentElement.scrollHeight - innerHeight,
        viewport: [innerWidth, innerHeight],
      }));
      same =
        last?.scrollY === current.scrollY && last?.max === current.max
          ? same + 1
          : 0;
      if (same >= 5) return current;
      last = current;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("Scroll did not settle");
  };
  await tab.playwright.getByRole("link", { name: "خانه", exact: true }).click();
  await tab.playwright
    .locator('[data-ssgoi-transition="/discovery"]')
    .waitFor({ state: "hidden" });
  // Separate settled-tab restoration from input during the transition lifecycle.
  // Use scrollImmediately=true to probe the latter without claiming it passed.
  if (!scrollImmediately) await stableScroll();
  await tab.scroll([200, 500], "down", 2);
  const before = await stableScroll();
  if (before.max <= 0 || Math.abs(before.scrollY - before.max) >= 1)
    throw new Error("Home fixture must reach a nonzero bottom position");
  await tab.playwright.getByRole("link", { name: "کشف", exact: true }).click();
  await tab.playwright
    .locator('[data-ssgoi-transition="/"]')
    .waitFor({ state: "hidden" });
  const other = await stableScroll();
  await tab.playwright.getByRole("link", { name: "خانه", exact: true }).click();
  await tab.playwright
    .locator('[data-ssgoi-transition="/discovery"]')
    .waitFor({ state: "hidden" });
  const after = await stableScroll();
  const result = {
    before,
    other,
    after,
    pass: Math.abs(before.scrollY - after.scrollY) < 1,
  };
  if (!result.pass)
    throw new Error(`Tab scroll regression: ${JSON.stringify(result)}`);
  return result;
}
