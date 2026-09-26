import type { TabularData } from '@/models'

/**
 * Rebalancing by oversampling (W2-L6): every class-1 row appears `times` times, so the minority
 * weighs as much in the loss as `times` majority points. times = 1 returns the data unchanged.
 */
export function oversampleMinority(data: TabularData, times: number): TabularData {
  if (times <= 1) {
    return data
  }
  const rows: number[] = []
  data.y.forEach((label, row) => {
    const copies = label === 1 ? times : 1
    for (let copy = 0; copy < copies; copy++) rows.push(row)
  })
  return {
    columns: data.columns.map((column) => Float64Array.from(rows, (row) => column[row] ?? 0)),
    y: Float64Array.from(rows, (row) => data.y[row] ?? 0),
  }
}
