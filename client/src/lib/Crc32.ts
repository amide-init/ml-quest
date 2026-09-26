const TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

/** CRC-32 (IEEE, as in zip and PNG) of a string's UTF-8 bytes, as 8 lowercase hex digits. */
export function crc32(text: string): string {
  let crc = 0xffffffff
  for (const byte of new TextEncoder().encode(text)) {
    crc = (TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8)
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0')
}
