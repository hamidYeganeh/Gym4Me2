import {
  createCipheriv,
  createDecipheriv,
  createPrivateKey,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
} from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { appendFile, link, stat, unlink, writeFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
const derive = (privateKey, publicKey) =>
  Buffer.from(
    hkdfSync(
      "sha256",
      diffieHellman({ privateKey, publicKey }),
      Buffer.alloc(0),
      Buffer.from("gym4me-backup-v1"),
      32,
    ),
  );
export async function encryptBackup(source, destination, recipientPem) {
  const pair = generateKeyPairSync("x25519"),
    nonce = randomBytes(12),
    header = Buffer.from(
      JSON.stringify({
        version: 1,
        key: pair.publicKey.export({ format: "jwk" }),
        nonce: nonce.toString("base64url"),
      }) + "\n",
    );
  const cipher = createCipheriv(
    "aes-256-gcm",
    derive(pair.privateKey, createPublicKey(recipientPem)),
    nonce,
  );
  cipher.setAAD(header);
  await writeFile(destination, header, { flag: "wx", mode: 0o600 });
  try {
    await pipeline(
      createReadStream(source),
      cipher,
      createWriteStream(destination, { flags: "a", mode: 0o600 }),
    );
    await appendFile(destination, cipher.getAuthTag());
  } catch (error) {
    await unlink(destination).catch(() => undefined);
    throw error;
  }
}
export async function decryptBackup(source, destination, privatePem) {
  const prefix = await new Promise((resolve, reject) => {
    const stream = createReadStream(source, { start: 0, end: 4095 });
    const chunks = [];
    stream.on("data", (c) => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
  const newline = prefix.indexOf(10);
  if (newline < 0) throw new Error("Invalid backup header");
  const header = prefix.subarray(0, newline + 1),
    meta = JSON.parse(header.toString());
  if (meta.version !== 1) throw new Error("Unsupported backup format");
  const size = (await stat(source)).size;
  if (size <= header.length + 16) throw new Error("Truncated backup");
  const tag = await new Promise((resolve, reject) => {
    const stream = createReadStream(source, { start: size - 16 });
    const chunks = [];
    stream.on("data", (c) => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
  const cipher = createDecipheriv(
    "aes-256-gcm",
    derive(
      createPrivateKey(privatePem),
      createPublicKey({ key: meta.key, format: "jwk" }),
    ),
    Buffer.from(meta.nonce, "base64url"),
  );
  cipher.setAAD(header);
  cipher.setAuthTag(tag);
  const temporary = destination + ".partial-" + randomBytes(8).toString("hex");
  try {
    await pipeline(
      createReadStream(source, { start: header.length, end: size - 17 }),
      cipher,
      createWriteStream(temporary, { flags: "wx", mode: 0o600 }),
    );
    await link(temporary, destination);
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
}
