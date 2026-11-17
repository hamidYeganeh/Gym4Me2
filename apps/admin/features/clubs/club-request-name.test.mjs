import assert from "node:assert/strict";
import test from "node:test";

import { clubRequestName } from "./club-request-name.ts";

test("uses the title for published profiles without a legacy name", () => {
  assert.equal(clubRequestName({ title: "باشگاه نمونه" }), "باشگاه نمونه");
  assert.equal(clubRequestName({ title: "باشگاه نمونه", name: "نام قدیمی" }), "باشگاه نمونه");
});

test("keeps the name of legacy registration requests and tolerates missing names", () => {
  assert.equal(clubRequestName({ name: "باشگاه قدیمی" }), "باشگاه قدیمی");
  assert.equal(clubRequestName({ title: null }), "");
});
