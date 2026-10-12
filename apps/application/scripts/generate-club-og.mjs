import { createRequire } from "node:module";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(new URL("../package.json", import.meta.url));
const fontConfigDir = path.join(os.tmpdir(), "gym4me-og-fonts");
await mkdir(fontConfigDir, { recursive: true });
await writeFile(
  path.join(fontConfigDir, "fonts.conf"),
  `<fontconfig><dir>/System/Library/Fonts</dir><dir>/Library/Fonts</dir><dir>/usr/share/fonts</dir><cachedir>${fontConfigDir}</cachedir></fontconfig>`,
);
process.env.FONTCONFIG_FILE = path.join(fontConfigDir, "fonts.conf");
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const ts = require("typescript");
const source = await readFile(path.join(root, "lib/clubs.ts"), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
});
const { getClubs } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);
const fontfile = path.resolve(
  root,
  "../../packages/theme/src/fonts/IRANSansXV.woff2",
);
const svg = (body) =>
  Buffer.from(
    `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">${body}</svg>`,
  );
const escape = (value) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
async function text(value, size, color, top, left, width, bold = false) {
  const input = await sharp({
    text: {
      text: `<span foreground="${color}"${bold ? ' weight="bold"' : ""}>${escape(value)}</span>`,
      font: `IRANSansX ${size}`,
      fontfile,
      width,
      align: "right",
      rgba: true,
      dpi: 72,
    },
  })
    .png()
    .toBuffer();
  return { input, top, left };
}
await mkdir(path.join(root, "public/images/og"), { recursive: true });
for (const locale of ["fa", "en"]) {
  for (const club of getClubs(locale)) {
    const photoPath = path.join(root, "public", club.photos[0].src);
    const background = await sharp(photoPath)
      .resize(1200, 630, { fit: "cover" })
      .blur(12)
      .modulate({ brightness: 0.35 })
      .png()
      .toBuffer();
    const photo = await sharp(photoPath)
      .resize(475, 526, { fit: "cover" })
      .composite([
        {
          input: Buffer.from(
            '<svg width="475" height="526"><rect width="475" height="526" rx="28" fill="white"/></svg>',
          ),
          blend: "dest-in",
        },
      ])
      .png()
      .toBuffer();
    const card = svg(
      '<rect x="39" y="34" width="1122" height="562" rx="40" fill="#f9faf9"/><rect x="74" y="501" width="576" height="1" fill="#e4e4e7"/><rect x="98" y="442" width="32" height="8" rx="4" fill="#10e943"/>',
    );
    const layers = [
      { input: card },
      { input: photo, top: 52, left: 666 },
      await text("Gym4Me", 27, "#29292c", 80, 74, 540, true),
      await text(club.name, 46, "#29292c", 178, 74, 540, true),
      await text(club.category, 24, "#606069", 255, 74, 540),
      await text(club.address, 23, "#606069", 303, 74, 540),
      await text(
        `${club.price} / ${club.pricePeriod}`,
        28,
        "#29292c",
        387,
        74,
        540,
        true,
      ),
      await text(
        locale === "fa"
          ? "جایی برای قوی‌تر شدن"
          : "Find your next training space",
        21,
        "#606069",
        533,
        74,
        540,
      ),
    ];
    await sharp(background)
      .composite(layers)
      .png()
      .toFile(path.join(root, `public/images/og/${club.id}-${locale}.png`));
  }
}
console.log("Generated club share cards (1200 × 630).");
