let context: AudioContext | null = null

/** Two rising notes (E5 → A5): short, soft and synthesized, so there is no audio file to load. */
const NOTES = [
  { frequency: 659.25, start: 0, length: 0.18 },
  { frequency: 880, start: 0.12, length: 0.32 },
] as const

/**
 * Plays the level-passed chime. Returns false where audio isn't available (no Web Audio,
 * blocked before a user gesture), so callers never have to care: sound is a bonus, never needed.
 */
export function playChime(): boolean {
  try {
    context ??= new AudioContext()
    if (context.state === 'suspended') void context.resume()
    const now = context.currentTime
    for (const note of NOTES) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = note.frequency
      // A quick attack and a smooth fade, so the notes don't click.
      gain.gain.setValueAtTime(0, now + note.start)
      gain.gain.linearRampToValueAtTime(0.12, now + note.start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.length)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(now + note.start)
      oscillator.stop(now + note.start + note.length + 0.05)
    }
    return true
  } catch {
    return false
  }
}
