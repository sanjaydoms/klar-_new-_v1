import crypto from "node:crypto";

import { envConfig } from "../config/env.config";

/**
 * Credential encryption at rest.
 *
 * AES-256-GCM, one random IV per value, authentication tag stored alongside.
 * GCM rather than CBC so a tampered ciphertext fails to decrypt instead of
 * decrypting to garbage that then gets sent to a supplier as an API key.
 *
 * The key lives in this service's environment. That is a deliberate stopping
 * point, not the end state: everything goes through encrypt/decrypt/mask here,
 * so moving to a managed secrets store later replaces this file and nothing
 * else. Nowhere outside this module reads MASTER_KEY.
 *
 * ponytail: env-held master key, swap for KMS/Secrets Manager when KLAR has one.
 */

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // GCM standard; 96-bit IVs are the fast, spec-blessed path.

/**
 * Resolved per call rather than at module load so a missing key fails only the
 * operation that actually needs a secret, with a message naming the variable.
 */
const key = (): Buffer => {
  const raw = envConfig.MASTER_KEY;
  if (!raw) {
    throw new Error(
      "INTEGRATION_MASTER_KEY is not set — credential encryption is unavailable.",
    );
  }
  const buf = Buffer.from(raw, "hex");
  if (buf.length !== 32) {
    throw new Error(
      `INTEGRATION_MASTER_KEY must be 32 bytes of hex (64 characters); got ${buf.length} bytes.`,
    );
  }
  return buf;
};

/** Ciphertext format: v1.<iv>.<tag>.<data>, all base64url. Versioned so the
 *  algorithm can change without guessing at what old rows contain. */
export const encrypt = (plaintext: string): string => {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key(), iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    data.toString("base64url"),
  ].join(".");
};

export const decrypt = (payload: string): string => {
  const [version, ivB64, tagB64, dataB64] = payload.split(".");
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed ciphertext — cannot decrypt.");
  }
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key(),
    Buffer.from(ivB64, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
};

export const isEncrypted = (value: string): boolean => value.startsWith("v1.");

/**
 * What the browser is allowed to see of a secret: bullets and the last four
 * characters, enough for an admin to tell which key is installed without
 * telling anyone what it is (§15).
 *
 * Short values reveal nothing at all — showing the last four of a six-character
 * secret would hand over most of it.
 */
export const mask = (plaintext: string): string => {
  if (!plaintext) return "";
  if (plaintext.length <= 8) return "••••••••";
  return `••••••••${plaintext.slice(-4)}`;
};
