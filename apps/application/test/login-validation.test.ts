import assert from "node:assert/strict";
import test from "node:test";
import {
  loginFieldErrors,
  normalizeLoginPhone,
} from "../../../packages/ui/src/account/login-validation";

const initial = {
  phone: "",
  password: "",
  code: "",
  challenge: null,
  method: "otp" as const,
};
test("login accepts the mobile-number forms accepted by the server contract", () => {
  for (const phone of [
    "09123456789",
    "+989123456789",
    "00989123456789",
    "۰۹۱۲۳۴۵۶۷۸۹",
    "٠٩١٢٣٤٥٦٧٨٩",
    "+98 (912) 345-6789",
  ]) {
    assert.equal(normalizeLoginPhone(phone), "+989123456789");
    assert.deepEqual(loginFieldErrors({ ...initial, phone }), {});
  }
});
test("missing and malformed phone errors stay distinct from password errors", () => {
  assert.deepEqual(loginFieldErrors({ ...initial, method: "password" }), {
    phone: "phoneRequired",
    password: "passwordRequired",
  });
  for (const phone of [
    "12345",
    "+98912345678",
    "+9891234567890",
    "+9719123456789",
    "0912abc6789",
  ])
    assert.deepEqual(loginFieldErrors({ ...initial, phone }), {
      phone: "phoneInvalid",
    });
  assert.deepEqual(loginFieldErrors({ ...initial, phone: "  " }), {
    phone: "phoneRequired",
  });
});
test("existing passwords keep spaces and the server's 128-character boundary", () => {
  const password = {
    ...initial,
    method: "password" as const,
    phone: "09123456789",
  };
  assert.deepEqual(loginFieldErrors({ ...password, password: " " }), {});
  assert.deepEqual(
    loginFieldErrors({ ...password, password: "x".repeat(128) }),
    {},
  );
  assert.deepEqual(
    loginFieldErrors({ ...password, password: "x".repeat(129) }),
    { password: "passwordTooLong" },
  );
  assert.deepEqual(loginFieldErrors(password), {
    password: "passwordRequired",
  });
});
test("SMS login does not validate an inactive password field", () => {
  assert.deepEqual(
    loginFieldErrors({
      ...initial,
      phone: "09123456789",
      password: "x".repeat(129),
    }),
    {},
  );
});
test("an issued challenge validates only its five-digit code", () => {
  for (const code of ["12345", "۱۲۳۴۵", "١٢٣٤٥"])
    assert.deepEqual(
      loginFieldErrors({
        ...initial,
        challenge: "fixture",
        method: "password",
        code,
      }),
      {},
    );
});
test("a five-character nonnumeric or padded code cannot pass the SMS guard", () => {
  for (const code of ["", "1234", "123456", "abcde", "1234x", "12345 "])
    assert.deepEqual(
      loginFieldErrors({ ...initial, challenge: "fixture", code }),
      { code: "codeInvalid" },
    );
});
