import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StarRating } from './StarRating'

describe('StarRating', () => {
  it('announces the star count and fills that many stars', () => {
    const { container } = render(<StarRating stars={2} />)
    expect(screen.getByRole('img', { name: '2 of 3 stars' })).toBeInTheDocument()
    expect(container.querySelectorAll('path[class*="earned"]')).toHaveLength(2)
  })
})
