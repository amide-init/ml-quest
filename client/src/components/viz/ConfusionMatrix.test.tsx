import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConfusionMatrix } from './ConfusionMatrix'

describe('ConfusionMatrix', () => {
  it('puts each count under its real class (row) and the model call (column)', () => {
    render(
      <ConfusionMatrix
        confusion={{
          truePositives: 45,
          falseNegatives: 15,
          falsePositives: 20,
          trueNegatives: 220,
        }}
        caption="Training people"
        actual={['Really hill folk', 'Really lowlanders']}
        predicted={['Invited', 'Not invited']}
        cells={{
          truePositives: 'found',
          falseNegatives: 'missed',
          falsePositives: 'invited by mistake',
          trueNegatives: 'rightly left out',
        }}
      />,
    )
    const table = screen.getByRole('table', { name: 'Training people' })
    const [, hill, low] = within(table).getAllByRole('row')
    expect(within(hill!).getByRole('rowheader')).toHaveTextContent('Really hill folk')
    expect(
      within(hill!)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['45found', '15missed'])
    expect(
      within(low!)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['20invited by mistake', '220rightly left out'])
  })
})
