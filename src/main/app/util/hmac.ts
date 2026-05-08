const crypto = require("crypto");

export function hmacSha256(key: string, message: string): string {
  return crypto
    .createHmac("sha256", key)
    .update(message, "utf8")
    .digest("hex");
}

export function compareHashes(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
