// Run through cua_repl. This helper uses the selected tab's documented APIs;
// it never opens another browser, changes page DOM, or substitutes a renderer.
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";

export async function capturePh0({ tab, cdp, selector, path }) {
  const measure = () =>
    tab.playwright.evaluate((selector) => {
      const node = document.querySelector(selector);
      if (!node) throw new Error(`Missing target: ${selector}`);
      const r = node.getBoundingClientRect();
      const active = document.activeElement;
      const focusStyle = active ? getComputedStyle(active) : null;
      return {
        selector,
        path: location.pathname,
        locale: document.documentElement.lang,
        theme: document.documentElement.classList.contains("dark")
          ? "dark"
          : "light",
        viewport: [innerWidth, innerHeight],
        dpr: devicePixelRatio,
        visual: {
          width: visualViewport.width,
          height: visualViewport.height,
          scale: visualViewport.scale,
          pageTop: visualViewport.pageTop,
          pageLeft: visualViewport.pageLeft,
        },
        rect: { x: r.x, y: r.y, width: r.width, height: r.height },
        fontsLoaded: document.fonts.status === "loaded",
        imagesReady: [...node.querySelectorAll("img")].every(
          (img) => img.complete && img.naturalWidth > 0,
        ),
        focused: active?.matches(":focus-visible") ?? false,
        focusWithin: !!active && node.contains(active),
        indicator: focusStyle && {
          outline: focusStyle.outline,
          offset: focusStyle.outlineOffset,
          shadow: focusStyle.boxShadow,
        },
      };
    }, selector);
  const before = await measure();
  const metrics = await cdp.send("Page.getLayoutMetrics", {});
  // The layout viewport's integer height can round down at fractional scroll
  // positions. The visual viewport is the actual area captured by this PNG.
  const css = metrics.cssVisualViewport;
  const device = metrics.visualViewport;
  if (
    before.visual.scale !== 1 ||
    before.visual.width !== before.viewport[0] ||
    before.visual.height !== before.viewport[1] ||
    css.clientWidth !== before.viewport[0] ||
    css.clientHeight !== before.viewport[1] ||
    device.clientWidth !== css.clientWidth * before.dpr ||
    device.clientHeight !== css.clientHeight * before.dpr
  )
    throw new Error("Capture/backing scale differs from DOM viewport or DPR");
  const r = before.rect;
  if (
    !before.fontsLoaded ||
    !before.imagesReady ||
    r.width <= 0 ||
    r.height <= 0 ||
    r.x < 8 ||
    r.y < 8 ||
    r.x + r.width > before.viewport[0] - 8 ||
    r.y + r.height > before.viewport[1] - 8
  )
    throw new Error("Target is not fully painted/contained with 8px padding");
  // DOM scroll can commit before the compositor supplies a new screenshot.
  // Require two consecutive identical full viewport frames, without tolerances.
  const captureHashes = [];
  let bytes;
  for (let attempt = 0; attempt < 20; attempt++) {
    const screenshot = await cdp.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
      fromSurface: true,
    });
    bytes = Buffer.from(screenshot.data, "base64");
    captureHashes.push(createHash("sha256").update(bytes).digest("hex"));
    if (
      captureHashes.length >= 2 &&
      captureHashes.at(-1) === captureHashes.at(-2)
    )
      break;
  }
  if (captureHashes.length < 2 || captureHashes.at(-1) !== captureHashes.at(-2))
    throw new Error("Compositor frames did not settle within twenty captures");
  const png = {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
  if (
    bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
    png.width !== device.clientWidth ||
    png.height !== device.clientHeight
  )
    throw new Error("PNG dimensions differ from the actual backing viewport");
  const after = await measure();
  if (JSON.stringify(before) !== JSON.stringify(after))
    throw new Error("DOM/viewport moved during capture");
  await writeFile(path, bytes);
  return {
    ...before,
    png,
    file: path.split("/").at(-1),
    sha256: createHash("sha256").update(bytes).digest("hex"),
    cssViewport: css,
    backingViewport: device,
    captureHashes,
    scope:
      "Full viewport PNG and target containment; human visual review still required",
  };
}
