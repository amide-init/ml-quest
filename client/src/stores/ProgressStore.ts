import { create } from 'zustand'
import { DEFAULT_PROGRESS, type Progress } from '@/models'

interface ProgressState {
  readonly progress: Progress
  readonly setProgress: (progress: Progress) => void
}

/** Reactive copy of the player's progress. Kept in sync with ProgressService by app/Bootstrap. */
export const useProgressStore = create<ProgressState>()((set) => ({
  progress: DEFAULT_PROGRESS,
  setProgress: (progress) => set({ progress }),
}))
