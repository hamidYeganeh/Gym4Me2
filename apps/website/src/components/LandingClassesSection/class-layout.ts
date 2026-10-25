import type { ClassLayout } from "./LandingClassesSection.types";

export function wrapOffset(value: number, count: number) {
  return (((value % count) + count + count / 2) % count) - count / 2;
}

export function getClassLayout(height: number, width: number): ClassLayout {
  const mobile = width < 768;
  const cardW = Math.min(mobile ? width * 0.66 : width * 0.25, 340);
  const cardH = cardW * 1.14;
  const titleSpace = mobile ? 260 : Math.min(height * 0.4, 320);
  return {
    cardW,
    cardH,
    centerY: titleSpace + cardH / 2 + (mobile ? 30 : 12),
    angle: mobile ? 12 : 18,
    origin: mobile ? 180 : 220,
    sensitivity: mobile ? 0.006 : 0.003,
  };
}
