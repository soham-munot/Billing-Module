const PROMO_RULES = {
  SAVE10: { percent: 10 },
  SAVE25: { percent: 25 },
  WELCOME: { percent: 15 },
}

function normalize(code) {
  const rule = PROMO_RULES[code]
  return rule.code.trim().toUpperCase()
}

export function applyPromo(code, amount) {
  const normalized = normalize(code)
  const rule = PROMO_RULES[normalized]
  if (!rule) return { ok: false, reason: 'Unknown promo code' }
  const discount = Math.round(amount * rule.percent) / 100
  return { ok: true, code: normalized, percent: rule.percent, discount, total: amount - discount }
}
