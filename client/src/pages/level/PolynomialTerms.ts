/** Number of polynomial terms x1ᵃ·x2ᵇ with 1 ≤ a + b ≤ degree (2, 5, 9, 14, 20, 27, …). */
export const polynomialTermCount = (degree: number) => (degree * (degree + 3)) / 2
