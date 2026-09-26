/**
 * Copies text to the clipboard. False when the browser refuses (no permission, insecure
 * context, no Clipboard API), so the UI can ask the player to copy by hand instead.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
