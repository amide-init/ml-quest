import type { SettingsService } from './SettingsService'

/**
 * Sound effects, gated by the player's setting (off by default, PRD F11). The sound itself is
 * injected (platform/Sound in the app, a fake in tests), so this only decides *when* to play.
 */
export class AudioService {
  readonly #settings: SettingsService
  readonly #chime: () => void

  constructor(settings: SettingsService, chime: () => void) {
    this.#settings = settings
    this.#chime = chime
  }

  /** A level was passed: chime, if the player turned sound on. */
  levelPassed(): void {
    if (this.#settings.getSettings().soundEnabled) {
      this.#chime()
    }
  }

  /** Let the player hear the chime when they turn sound on. */
  preview(): void {
    this.#chime()
  }
}
