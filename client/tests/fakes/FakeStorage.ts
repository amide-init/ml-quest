/** Minimal in-memory Storage so this test runs in plain Node. */
export class FakeStorage implements Storage {
  readonly #items = new Map<string, string>()
  failWrites = false
  get length() {
    return this.#items.size
  }
  clear() {
    this.#items.clear()
  }
  getItem(key: string) {
    return this.#items.get(key) ?? null
  }
  key(index: number) {
    return [...this.#items.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.#items.delete(key)
  }
  setItem(key: string, value: string) {
    if (this.failWrites) {
      throw new Error('QuotaExceededError')
    }
    this.#items.set(key, value)
  }
  keys() {
    return [...this.#items.keys()]
  }
}
