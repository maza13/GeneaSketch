function getSubtleCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("Web Crypto API is not available in this runtime.");
  }
  return subtle;
}

export async function computeSha256Hex(bytes: Uint8Array | ArrayBuffer): Promise<string> {
  const source = bytes instanceof Uint8Array ? new Uint8Array(bytes) : bytes;
  const digest = await getSubtleCrypto().digest("SHA-256", source);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function computeSha256FromBytes(bytes: Uint8Array): Promise<string> {
  return `sha256:${await computeSha256Hex(bytes)}`;
}

export async function computeSha256FromString(payload: string): Promise<string> {
  return computeSha256FromBytes(new TextEncoder().encode(payload));
}
