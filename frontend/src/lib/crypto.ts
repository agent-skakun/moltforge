import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

function getEncKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) throw new Error("ENCRYPTION_KEY not configured");
  return Buffer.from(hex, "hex");
}

/** AES-256-GCM encrypt. Returns hex-packed iv+tag+ciphertext. */
export function encrypt(plain: string): string {
  const key = getEncKey();
  const iv  = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc  = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag  = cipher.getAuthTag();
  return iv.toString("hex") + tag.toString("hex") + enc.toString("hex");
}

/** AES-256-GCM decrypt. */
export function decrypt(packed: string): string {
  const key  = getEncKey();
  const iv   = Buffer.from(packed.slice(0, 24),  "hex");
  const tag  = Buffer.from(packed.slice(24, 56), "hex");
  const enc  = Buffer.from(packed.slice(56),     "hex");
  const dec  = createDecipheriv("aes-256-gcm", key, iv);
  dec.setAuthTag(tag);
  return dec.update(enc).toString("utf8") + dec.final("utf8");
}
