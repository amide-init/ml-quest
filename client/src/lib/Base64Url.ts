/** Bytes → base64url without padding (safe in URLs and when copied from chat apps). */
export function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

/** base64url (with or without padding) → bytes. Throws on characters outside the alphabet. */
export function fromBase64Url(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*=*$/.test(text)) {
    throw new Error('Not base64url')
  }
  const base64 = text.replaceAll('-', '+').replaceAll('_', '/')
  return Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), (char) =>
    char.charCodeAt(0),
  )
}
