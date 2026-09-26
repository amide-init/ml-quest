/**
 * Fails when the built JavaScript breaks the performance budgets in ARCHITECTURE §11
 * (gzip, kB = 1000 bytes, as Vite reports them). Run after `pnpm build`: `pnpm size`.
 *
 * - Initial JS: the entry chunk index.html loads, plus the chunks it imports statically.
 * - Every other (lazy) chunk: at most one per-world level chunk budget.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const BUDGET_KB = { initial: 170, lazyChunk: 40 }
const dist = new URL('../dist/', import.meta.url).pathname
const assets = join(dist, 'assets')

const gzipKb = (file) => gzipSync(readFileSync(join(assets, file))).length / 1000
const html = readFileSync(join(dist, 'index.html'), 'utf8')
const entry = html.match(/<script[^>]+src="[^"]*\/assets\/([^"]+\.js)"/)?.[1]
if (!entry) {
  console.error('No entry script found in dist/index.html. Run `pnpm build` first.')
  process.exit(1)
}
// Chunks loaded up front with the entry (modulepreload links), not on demand.
const preloaded = [
  ...html.matchAll(/rel="modulepreload"[^>]+href="[^"]*\/assets\/([^"]+\.js)"/g),
].map((match) => match[1])
const initialFiles = [entry, ...preloaded]
const lazyFiles = readdirSync(assets).filter(
  (file) => file.endsWith('.js') && !initialFiles.includes(file),
)

let failed = false
const report = (label, kb, budget) => {
  const ok = kb <= budget
  failed ||= !ok
  console.info(
    `${ok ? 'ok  ' : 'OVER'}  ${label.padEnd(44)} ${kb.toFixed(1).padStart(7)} kB / ${budget} kB`,
  )
}
report(
  'initial JS',
  initialFiles.map(gzipKb).reduce((sum, kb) => sum + kb, 0),
  BUDGET_KB.initial,
)
for (const file of lazyFiles) report(`lazy chunk ${file}`, gzipKb(file), BUDGET_KB.lazyChunk)

if (failed) {
  console.error(
    '\nOver budget (ARCHITECTURE §11). Split the code or trim a dependency before merging.',
  )
  process.exit(1)
}
