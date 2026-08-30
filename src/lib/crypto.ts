import { createHmac, createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

function key(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || "dev-only-encryption-key-do-not-ship";
  return scryptSync(secret, "lifey-pii", 32);
}

export function hashLookup(value: string) {
  const secret = process.env.ENCRYPTION_KEY || "dev-only-encryption-key-do-not-ship";
  return createHmac("sha256", secret).update(value.trim().toLowerCase()).digest("hex");
}

export function encryptPii(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

export function decryptPii(payload: string) {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) return "[unavailable]";
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

export function redactSsn(value: string | null | undefined) {
  if (!value) return null;
  return `***-**-${value.slice(-4)}`;
}

export function normalizeName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,]/g, " ")
    .replace(/\b(jr|sr|ii|iii|iv|esq)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}
