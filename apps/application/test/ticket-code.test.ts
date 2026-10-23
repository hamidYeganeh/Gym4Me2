import { test } from "node:test";
import assert from "node:assert/strict";
import QRCode from "qrcode";
import { decodeTicketFrame } from "../../../packages/ui/src/lib/ticket-code";
test("fallback scanner decodes the same opaque ticket rendered by the ticket page", () => {
  const token = "gym4me:ticket:opaque-signed-payload-0123456789";
  const { modules } = QRCode.create(token, { errorCorrectionLevel: "M" });
  const scale = 6,
    margin = 4,
    size = (modules.size + margin * 2) * scale;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const row = Math.floor(y / scale) - margin,
        col = Math.floor(x / scale) - margin;
      if (
        row >= 0 &&
        col >= 0 &&
        row < modules.size &&
        col < modules.size &&
        modules.get(row, col)
      ) {
        const offset = (y * size + x) * 4;
        data[offset] = data[offset + 1] = data[offset + 2] = 0;
      }
    }
  assert.equal(decodeTicketFrame({ data, width: size, height: size }), token);
  assert.equal(
    decodeTicketFrame({
      data: new Uint8ClampedArray(40 * 40 * 4).fill(255),
      width: 40,
      height: 40,
    }),
    null,
  );
});
