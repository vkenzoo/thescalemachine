/**
 * AES-256-GCM encrypt/decrypt para tokens da Meta API.
 *
 * Por que GCM:
 * - Authenticated encryption (detecta tampering automaticamente via tag)
 * - Padrão da indústria para data-at-rest (AWS, GCP usam o mesmo)
 * - Performance native via WebCrypto/Node crypto
 *
 * Formato armazenado em DB:
 *   ciphertext: base64(<iv 12 bytes><authTag 16 bytes><encrypted>)
 *
 * Use sempre `encrypt(plaintext, KEY)` e `decrypt(ciphertext, KEY)`.
 * KEY = ENCRYPTION_KEY env var, 32 bytes em base64.
 *
 * Gerar uma key nova: openssl rand -base64 32
 */

import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12; // GCM canonical
const TAG_LEN = 16;

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY env var não configurada");
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error("ENCRYPTION_KEY precisa ter 32 bytes (256 bits) em base64");
  }
  return buf;
}

/**
 * Criptografa uma string e retorna ciphertext em base64 (já contém IV + tag).
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Formato: [IV (12)] [TAG (16)] [CIPHERTEXT]
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

/**
 * Descriptografa uma string previamente cifrada com encrypt().
 * Lança se a integridade falhar (tampering detectado).
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  const buf = Buffer.from(ciphertext, "base64");
  if (buf.length < IV_LEN + TAG_LEN) {
    throw new Error("Ciphertext malformado");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const encrypted = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return plain.toString("utf8");
}

/**
 * Helper para gerar uma chave nova durante setup.
 * Use no terminal: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */
export function generateKey(): string {
  return randomBytes(32).toString("base64");
}
