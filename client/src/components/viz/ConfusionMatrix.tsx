import type { Confusion } from '@/models'
import styles from './ConfusionMatrix.module.css'

interface ConfusionMatrixProps {
  readonly confusion: Confusion
  readonly caption: string
  /** Row headers: what each point really is (class 1 first). */
  readonly actual: readonly [positive: string, negative: string]
  /** Column headers: what the model called it (class 1 first). */
  readonly predicted: readonly [positive: string, negative: string]
  /** What each cell means, in the level's words. */
  readonly cells: {
    readonly truePositives: string
    readonly falseNegatives: string
    readonly falsePositives: string
    readonly trueNegatives: string
  }
}

/**
 * A 2×2 confusion matrix (W2-L7): real class in rows, the model's call in columns. A table, so
 * screen readers announce each count with its row and column.
 */
export function ConfusionMatrix({
  confusion,
  caption,
  actual,
  predicted,
  cells,
}: ConfusionMatrixProps) {
  const cell = (key: keyof Confusion, right: boolean) => (
    <td className={right ? styles['right'] : styles['wrong']}>
      <span className={styles['count']}>{confusion[key]}</span>
      <span className={styles['meaning']}>{cells[key]}</span>
    </td>
  )
  return (
    <table className={styles['matrix']}>
      <caption className={styles['caption']}>{caption}</caption>
      <thead>
        <tr>
          <td />
          <th scope="col">{predicted[0]}</th>
          <th scope="col">{predicted[1]}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">{actual[0]}</th>
          {cell('truePositives', true)}
          {cell('falseNegatives', false)}
        </tr>
        <tr>
          <th scope="row">{actual[1]}</th>
          {cell('falsePositives', false)}
          {cell('trueNegatives', true)}
        </tr>
      </tbody>
    </table>
  )
}
