import type { Exercise, PlanContent } from "@repo/api/profile";
/** Browser text shaping preserves Persian joins and bidirectional numbers in the exported file. */
export async function createPlanPdf(
  content: PlanContent,
  library: Exercise[],
  locale: string,
  labels: {
    sets: string;
    reps: string;
    seconds: string;
    kg: string;
    rest: string;
    nutrition: string;
    version: string;
  },
  version?: number,
  canvasOverride?: HTMLCanvasElement,
  fontOverride?: string,
) {
  const { jsPDF } = await import("jspdf");
  if (typeof document !== "undefined") await document.fonts.ready;
  const canvas = canvasOverride ?? document.createElement("canvas");
  canvas.width = 1654;
  canvas.height = 2339;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("PDF canvas unavailable");
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  pdf.setProperties({ title: content.title, creator: "Gym4Me" });
  const rtl = locale === "fa",
    family = fontOverride ?? getComputedStyle(document.body).fontFamily,
    number = new Intl.NumberFormat(locale);
  let y = 120,
    page = 0;
  function reset() {
    ctx!.fillStyle = "#ffffff";
    ctx!.fillRect(0, 0, canvas.width, canvas.height);
    ctx!.fillStyle = "#17251d";
    ctx!.textBaseline = "top";
    ctx!.textAlign = rtl ? "right" : "left";
    ctx!.direction = rtl ? "rtl" : "ltr";
    y = 120;
  }
  function flush() {
    if (page++) pdf.addPage();
    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      0,
      0,
      210,
      297,
      undefined,
      "FAST",
    );
    reset();
  }
  function paragraph(text: string, size = 29) {
    ctx!.font = `${size}px ${family}`;
    const lines: string[] = [];
    for (const segment of text
      .replace(/[—–]/g, "-")
      .replace(/·/g, "|")
      .split("\n")) {
      let line = "";
      for (const word of segment.split(/\s+/)) {
        const candidate = line ? line + " " + word : word;
        if (ctx!.measureText(candidate).width > 1414 && line) {
          lines.push(line);
          line = word;
        } else line = candidate;
      }
      lines.push(line);
    }
    for (const line of lines) {
      if (y + size * 1.6 > 2210) {
        flush();
        ctx!.font = `${size}px ${family}`;
      }
      ctx!.fillText(line, rtl ? 1534 : 120, y, 1414);
      y += size * 1.6;
    }
    y += 18;
  }
  reset();
  paragraph(content.title, 46);
  if (version !== undefined)
    paragraph(`${labels.version} ${number.format(version)}`, 25);
  if (content.note) paragraph(content.note);
  for (const day of content.days) {
    paragraph(day.name, 37);
    for (const e of day.exercises) {
      const movement = library.find((m) => m.id === e.exerciseId);
      paragraph(
        (locale === "fa" ? movement?.nameFa : movement?.nameEn) ?? e.exerciseId,
        32,
      );
      paragraph(
        `${number.format(e.sets)} ${labels.sets} · ${number.format(e.reps ?? e.seconds ?? 0)} ${e.reps === null ? labels.seconds : labels.reps}${e.load === null ? "" : ` · ${number.format(e.load)} ${labels.kg}`} · ${labels.rest}: ${number.format(e.restSeconds)} ${labels.seconds}`,
        26,
      );
      if (e.group !== "single") paragraph(`${e.group} ${e.groupId}`, 24);
      if (e.note) paragraph(e.note, 26);
    }
  }
  if (content.nutrition) {
    paragraph(labels.nutrition, 37);
    paragraph(content.nutrition);
  }
  flush();
  return new Uint8Array(pdf.output("arraybuffer"));
}
