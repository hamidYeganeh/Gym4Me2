import jsQR from "jsqr";
/** Camera frames stay in memory; only the decoded opaque token leaves the reader. */
export function decodeTicketFrame(frame: {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}) {
  const value = jsQR(frame.data, frame.width, frame.height, {
    inversionAttempts: "dontInvert",
  })?.data;
  return value && value.length <= 8192 ? value : null;
}
