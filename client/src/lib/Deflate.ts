/**
 * Raw DEFLATE via the browser's CompressionStream (every current browser; Node 18+). Returns null
 * when the platform has no CompressionStream, so callers can fall back to uncompressed data.
 */
export async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null
  return pipe(bytes, new CompressionStream('deflate-raw'))
}

/** Inverse of deflateRaw. Rejects on corrupt input; null when DecompressionStream is missing. */
export async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === 'undefined') return null
  return pipe(bytes, new DecompressionStream('deflate-raw'))
}

/** Writes the bytes through a (de)compression stream and collects the output. */
async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const writer = stream.writable.getWriter()
  // Not awaited: the writes only settle as the readable side is drained below.
  const written = writer.write(bytes as Uint8Array<ArrayBuffer>).then(() => writer.close())
  // On corrupt input both sides fail; the reader reports it, so don't leave this rejection unhandled.
  written.catch(() => undefined)
  const chunks: Uint8Array[] = []
  const reader = stream.readable.getReader()
  for (let next = await reader.read(); !next.done; next = await reader.read()) {
    chunks.push(next.value)
  }
  await written
  const output = new Uint8Array(chunks.reduce((length, chunk) => length + chunk.length, 0))
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.length
  }
  return output
}
