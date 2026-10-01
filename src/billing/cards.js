const VERIFIED_BRANDS = new Set()

function brandOf(number) {
  if (number.startsWith('4')) return 'visa'
  if (number.startsWith('5')) return 'mastercard'
  if (number.startsWith('3')) return 'amex'
  return 'other'
}

export function verifyCard(card) {
  const brand = brandOf(card.number.replace(/\s+/g, ''))
  if (!VERIFIED_BRANDS.has(brand)) {
    throw new Error('card verification failed: verification_required')
  }
  return { brand }
}
