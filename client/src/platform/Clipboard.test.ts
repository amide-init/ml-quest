import { describe, expect, it } from 'vitest'
import { copyText } from './Clipboard'

describe('copyText', () => {
  it('reports false instead of throwing when there is no Clipboard API', async () => {
    // Node has a navigator but no clipboard: the same shape as an insecure or locked-down page.
    await expect(copyText('MLQ1-abc')).resolves.toBe(false)
  })
})
