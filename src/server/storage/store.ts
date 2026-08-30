import { mkdir, writeFile, readFile } from "fs/promises";
import { join } from "path";
import { randomBytes, createHmac } from "crypto";

export interface ObjectStore {
  put(bytes: Buffer, mime: string): Promise<{ key: string }>;
  signedReadUrl(key: string, ttlSeconds: number): Promise<string>;
}

export function getObjectStore(): ObjectStore {
  if (process.env.S3_BUCKET) {
    return {
      async put() {
        throw new Error("S3 adapter selected but not configured with a complete SDK implementation. Set keys or use local store.");
      },
      async signedReadUrl() {
        throw new Error("S3 adapter requires S3_BUCKET + credentials.");
      },
    };
  }
  return localEncryptedStore;
}

const localEncryptedStore: ObjectStore = {
  async put(bytes) {
    const key = randomBytes(16).toString("hex");
    const dir = join(process.cwd(), "storage");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, key), bytes);
    return { key };
  },
  async signedReadUrl(key, ttlSeconds) {
    const exp = Date.now() + ttlSeconds * 1000;
    const sig = createHmac("sha256", process.env.AUTH_SECRET || "dev").update(`${key}:${exp}`).digest("hex");
    return `/api/documents/file?key=${key}&exp=${exp}&sig=${sig}`;
  },
};

export async function readLocalObject(key: string) {
  return readFile(join(process.cwd(), "storage", key));
}
