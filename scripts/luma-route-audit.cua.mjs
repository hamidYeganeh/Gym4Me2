/** Run through cua_repl with its documented tab API, never a second browser driver. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const directory = `${root}.artifacts/luma-final-pass/`;
const routes = JSON.parse(
  await readFile(`${root}docs/qa/luma-route-inventory.json`, "utf8"),
);
const fixtureId = (number) =>
  `a1000000-0000-4000-8000-${number.toString(16).padStart(12, "0")}`;

export const cases = routes.map(({ surface, route }, index) => ({
  index,
  surface,
  route,
}));

export function routeUrl(index, state = "filled") {
  const { surface, route } = routes[index];
  const entity = route.includes("messages")
    ? 601
    : route.includes("support")
      ? 801
      : route.includes("memberships")
        ? 825
        : route.includes("calendars")
          ? 822
          : route.includes("coaches/detail")
            ? 9998
            : route.includes("workout")
              ? 700
              : route === "/discovery/club"
                ? 2001
                : 1;
  const parameters = new URLSearchParams({
    surface,
    route,
    state,
    id: fixtureId(entity),
    club: fixtureId(2001),
    branch: fixtureId(2101),
    entity: fixtureId(2001),
    service: fixtureId(1),
    occurrence: fixtureId(300),
    order: fixtureId(703),
  });
  return `http://localhost:7081/qa/routes?${parameters}`;
}

/** Each case is persisted independently, including failed or incomplete captures. */
export async function captureRoute(
  tab,
  index,
  state = "filled",
  variant = "fa-light-390",
) {
  const { surface, route } = routes[index];
  const started = Date.now();
  const url = routeUrl(index, state);
  if ((await tab.url()) === url) await tab.reload();
  else await tab.goto(url);
  await tab.playwright
    .locator(`[data-qa-route="${route}"]`)
    .waitFor({ state: "visible", timeoutMs: 10000 });
  const expectedLocale = variant.startsWith("en-") ? "en" : "fa";
  const expectedTheme = variant.includes("-dark-") ? "dark" : "light";
  await tab.playwright
    .locator(`html[lang="${expectedLocale}"].${expectedTheme}`)
    .waitFor({ state: "visible", timeoutMs: 10000 });
  let dom = "";
  if (route === "/discovery/map") {
    await tab.playwright
      .getByRole("heading", { name: /در حال بارگذاری نقشه|Loading map/ })
      .waitFor({ state: "hidden", timeoutMs: 25000 });
  }
  for (let pass = 0; pass < 3; pass++) {
    await tab.getAXState({ emit: false });
    try {
      await tab.playwright
        .locator('[aria-busy="true"]')
        .first()
        .waitFor({ state: "hidden", timeoutMs: 6000 });
    } catch {
      /* Preserve unsettled state as a finding below. */
    }
    dom = await tab.playwright.domSnapshot();
    if (!/در حال (دریافت|بارگذاری)|Loading (information|data)/.test(dom)) break;
  }
  const geometry = await tab.playwright.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    text: document.body.innerText,
    theme: document.documentElement.className,
    lang: document.documentElement.lang,
    headings: [...document.querySelectorAll("h1")].map(
      (element) => element.textContent,
    ),
    unmapped: Boolean(document.querySelector("[data-qa-unmapped]")),
    alerts: [...document.querySelectorAll('[role="alert"]')].map(
      (element) => element.textContent,
    ),
    busy: document.querySelectorAll('[aria-busy="true"]').length,
    brokenImages: [...document.images]
      .filter((element) => element.complete && !element.naturalWidth)
      .map((element) => element.getAttribute("src")),
  }));
  const logs = (await tab.dev.logs({ levels: ["error"], limit: 30 })).filter(
    (entry) => Date.parse(entry.timestamp) >= started,
  );
  const stem = `${String(index).padStart(3, "0")}-${surface}-${state}-${variant}`;
  const record = {
    index,
    surface,
    route,
    state,
    url,
    file: `${stem}.png`,
    capturedAt: new Date().toISOString(),
    ...geometry,
    logs,
    dom,
    loading: /در حال (دریافت|بارگذاری)|Loading (information|data)/.test(
      geometry.text,
    ),
    fullPage: false,
    captureError: null,
  };
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}${stem}.json`, JSON.stringify(record, null, 2));
  try {
    await writeFile(
      `${directory}${stem}.png`,
      await tab.screenshot({ fullPage: true }),
    );
    record.fullPage = true;
  } catch (error) {
    record.captureError = String(error);
    try {
      await writeFile(
        `${directory}${stem}.png`,
        await tab.screenshot({ fullPage: false }),
      );
    } catch (fallbackError) {
      record.captureError += `; viewport: ${String(fallbackError)}`;
    }
  }
  await writeFile(`${directory}${stem}.json`, JSON.stringify(record, null, 2));
  return {
    index,
    route: `${surface}${route}`,
    alerts: geometry.alerts,
    errors: logs.map((entry) => entry.message),
    overflow: geometry.scrollWidth > geometry.width,
    loading: record.loading,
    busy: geometry.busy,
    brokenImages: geometry.brokenImages,
    fullPage: record.fullPage,
    captureError: record.captureError,
  };
}
