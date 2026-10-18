/** Synthetic credentials go only to the local fixture, which returns405. */
export async function probeDeniedLogin(tab, cdp, activation) {
  await tab.reload();
  const locale = await tab.playwright.evaluate(
    () => document.documentElement.lang,
  );
  const otp = activation === "otp-double-click";
  if (!otp)
    await tab.playwright
      .getByText(locale === "fa" ? "رمز عبور" : "Password", { exact: true })
      .click();
  await tab.playwright
    .locator('input[data-auth-field="phone"]')
    .fill("09120000000");
  if (!otp)
    await tab.playwright
      .locator('input[data-auth-field="password"]')
      .fill("ph0-fixture-only");
  const button = tab.playwright.locator('button[type="submit"]');
  await tab.playwright
    .locator('button[type="submit"]:not(:disabled)')
    .waitFor({ state: "visible" });
  if (activation !== "keyboard") await button.press("ArrowRight");
  await cdp.send("Network.enable", {});
  const methods = ["Network.requestWillBeSent", "Network.responseReceived"];
  let cursor = (await cdp.readEvents({ methods, limit: 1000 })).cursor;
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 500,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  try {
    if (activation === "keyboard")
      await tab.playwright
        .locator('input[data-auth-field="password"]')
        .press("Enter");
    else if (activation === "leave-focus") {
      await button.click();
      await tab.playwright
        .getByRole("link", {
          name: locale === "fa" ? "خواندن سیاست داده" : "Read data policy",
          exact: true,
        })
        .press("ArrowRight");
    } else await button.dblclick();
    await tab.playwright
      .locator('main[data-gym-auth] [role="alert"]')
      .waitFor({ state: "visible" });
    const expected =
      activation === "keyboard"
        ? 'input[data-auth-field="password"]:focus'
        : activation === "leave-focus"
          ? 'a[href*="privacy"]:focus'
          : 'button[type="submit"]:focus';
    await tab.playwright.locator(expected).waitFor({ state: "visible" });
    const events = [];
    let more = true,
      truncated = false;
    while (more) {
      const batch = await cdp.readEvents({
        afterSequence: cursor,
        methods,
        limit: 1000,
      });
      cursor = batch.cursor;
      more = batch.hasMore;
      truncated ||= batch.truncated;
      events.push(...batch.events);
    }
    const posts = events.filter(
      (event) => event.params?.request?.method === "POST",
    );
    const ids = new Set(posts.map((event) => event.params.requestId));
    const statuses = events
      .filter(
        (event) =>
          event.method === "Network.responseReceived" &&
          ids.has(event.params.requestId),
      )
      .map((event) => event.params.response.status);
    const focus = await tab.playwright.evaluate(() => {
      const element = document.activeElement,
        r = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        surface: document.body.dataset.gymFocus,
        locale: document.documentElement.lang,
        tag: element.tagName,
        type: element.getAttribute("type"),
        field: element.getAttribute("data-auth-field"),
        href: element.getAttribute("href"),
        rect: { x: r.x, y: r.y, width: r.width, height: r.height },
        viewport: [innerWidth, innerHeight],
        scrollY,
        active: !element.closest('[inert],[aria-hidden="true"]'),
        focusVisible: element.matches(":focus-visible"),
        outlineWidth: style.outlineWidth,
        outlineOffset: style.outlineOffset,
        scrollMargin: style.scrollMargin,
        inViewport:
          r.top >= 0 &&
          r.left >= 0 &&
          r.bottom <= innerHeight &&
          r.right <= innerWidth,
        alert: document
          .querySelector('main[data-gym-auth] [role="alert"]')
          ?.textContent.trim(),
      };
    });
    return {
      ...focus,
      activation,
      posts: posts.length,
      statuses,
      truncated,
      scope: "Local405 only; no request payloads or input contents retained",
    };
  } finally {
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });
  }
}
