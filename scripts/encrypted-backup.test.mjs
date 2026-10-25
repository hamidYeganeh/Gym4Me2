import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encryptBackup, decryptBackup } from "./encrypted-backup.mjs";
test("backup restores with its separate recovery key and rejects tampering without publishing plaintext", async () => {
  const directory = await mkdtemp(join(tmpdir(), "gym4me-backup-proof-"));
  try {
    const pair = generateKeyPairSync("x25519"),
      publicPem = pair.publicKey.export({ format: "pem", type: "spki" }),
      privatePem = pair.privateKey.export({ format: "pem", type: "pkcs8" });
    await writeFile(
      join(directory, "source"),
      "Synthetic financial and private records",
    );
    await encryptBackup(
      join(directory, "source"),
      join(directory, "sealed"),
      publicPem,
    );
    assert.equal(
      (await readFile(join(directory, "sealed"))).includes(
        Buffer.from("Synthetic financial"),
      ),
      false,
    );
    await decryptBackup(
      join(directory, "sealed"),
      join(directory, "restored"),
      privatePem,
    );
    assert.equal(
      await readFile(join(directory, "restored"), "utf8"),
      "Synthetic financial and private records",
    );
    const bytes = await readFile(join(directory, "sealed"));
    bytes[bytes.length - 18] ^= 1;
    await writeFile(join(directory, "damaged"), bytes);
    await assert.rejects(() =>
      decryptBackup(
        join(directory, "damaged"),
        join(directory, "invalid-output"),
        privatePem,
      ),
    );
    await assert.rejects(() => readFile(join(directory, "invalid-output")));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
