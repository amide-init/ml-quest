/**
 * Returns localStorage if the browser lets us use it, otherwise null
 * (private modes and strict privacy settings can block or throw on access).
 */
export function getLocalStorage(): Storage | null {
  try {
    const storage = window.localStorage
    const probe = 'mlq:probe'
    storage.setItem(probe, probe)
    storage.removeItem(probe)
    return storage
  } catch {
    return null
  }
}
