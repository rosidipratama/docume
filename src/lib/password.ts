import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = await derive(password, salt, 64) as Buffer;
  return salt + ":" + hash.toString("hex");
}

export async function verifyPassword(password: string, stored?: string | null) {
  const [salt, hash] = (stored ?? "").split(":");
  const candidate = await derive(password, salt || "docume-unused-account", 64) as Buffer;
  return Boolean(hash && hash.length === 128 && timingSafeEqual(candidate, Buffer.from(hash, "hex")));
}
