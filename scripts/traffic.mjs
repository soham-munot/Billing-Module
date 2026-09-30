import { chromium } from '@playwright/test'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=')
    return [k, v]
  })
)
const mode = args.mode === 'bad' ? 'bad' : 'good'
const base = args.base || 'http://localhost:5173'
const visitors = Number(args.visitors || 15)
const offset = Number(args.offset || (mode === 'bad' ? 100 : 0))
const answerSurvey = args.survey !== 'false'

const QUOTES = {
  good: ['Quick and clear.', 'Promo worked first time.', 'Easy to find my invoices.', 'Smooth checkout.'],
  bad: [
    'The promo code button does nothing.',
    'Clicked apply promo five times, nothing happened.',
    'Could not apply my discount code.',
    'Apply promo is broken, very annoying.',
  ],
}

async function waitForPendo(page) {
  await page.waitForFunction(() => window.pendo && window.pendo.isReady && window.pendo.isReady(), null, {
    timeout: 20000,
  })
}

async function signIn(page, visitorId) {
  await page.goto(`${base}/`)
  await page.getByPlaceholder('visitor-001').fill(visitorId)
  await page.getByPlaceholder('email@pendo.io').fill(`${visitorId}@example.com`)
  await page.getByPlaceholder('Full Name').fill(`Visitor ${visitorId}`)
  await page.getByRole('button', { name: 'Submit' }).click()
  await page.waitForURL('**/invoices')
  await waitForPendo(page)
}

async function browse(page) {
  await page.locator('[data-pendo="invoice-download-pdf"]').first().click()
  await page.waitForTimeout(800)
  await page.getByRole('link', { name: 'Subscription' }).click()
  await page.waitForTimeout(800)
  await page.getByRole('link', { name: 'Payment methods' }).click()
  await page.locator('[data-pendo="card-number"]').fill('4242 4242 4242 4242')
  await page.locator('[data-pendo="card-name"]').fill('Demo Visitor')
  await page.locator('[data-pendo="card-expiry"]').fill('12/28')
  await page.locator('[data-pendo="save-card"]').click()
  await page.waitForTimeout(600)
}

async function applyPromo(page) {
  await page.locator('[data-pendo="promo-code"]').fill('SAVE10')
  const button = page.locator('[data-pendo="apply-promo"]')
  if (mode === 'good') {
    await button.click()
    await page.waitForTimeout(1200)
    return
  }
  for (let i = 0; i < 5; i++) {
    await button.click({ noWaitAfter: true })
    await page.waitForTimeout(150)
  }
  await page.waitForTimeout(1500)
  await button.click()
  await page.waitForTimeout(1200)
}

const GUIDE = '#pendo-base'

async function pickRating(page, groupName, rating) {
  const radio = page.locator(`${GUIDE} input.pendo-radio[name="${groupName}"]`).nth(rating - 1)
  const id = await radio.getAttribute('id')
  const label = page.locator(`${GUIDE} label[for="${id}"]`)
  if (await label.count()) await label.first().click()
  else await radio.check({ force: true })
}

async function advance(page) {
  const button = page
    .locator(`${GUIDE} button`)
    .filter({ hasText: /^(next|submit|done|finish|close)$/i })
    .first()
  if (await button.count()) {
    await button.click()
    await page.waitForTimeout(900)
    return true
  }
  return false
}

async function answer(page, index) {
  const guide = page.locator(GUIDE)
  const started = Date.now()
  try {
    await guide.locator('input.pendo-radio').first().waitFor({ state: 'attached', timeout: 45000 })
  } catch {
    console.log('  no survey guide shown')
    return false
  }
  console.log(`  survey guide after ${Math.round((Date.now() - started) / 1000)}s`)
  await page.waitForTimeout(500)
  const positive = mode === 'good' ? index % 5 !== 0 : index % 4 === 0
  const ratings = positive ? [5, 4, 5, 4] : [1, 2, 1, 2]
  const groups = await page.$$eval(`${GUIDE} input.pendo-radio`, (els) => [...new Set(els.map((e) => e.name))])
  for (const [i, name] of groups.entries()) {
    await pickRating(page, name, ratings[(index + i) % ratings.length])
    await page.waitForTimeout(250)
  }
  await advance(page)
  const quotes = QUOTES[positive ? 'good' : 'bad']
  const textareas = page.locator(`${GUIDE} textarea`)
  const count = await textareas.count()
  for (let i = 0; i < count; i++) {
    await textareas.nth(i).fill(quotes[(index + i) % quotes.length])
  }
  if (count > 0) await advance(page)
  await advance(page)
  console.log(`  survey answered (${positive ? 'positive' : 'negative'}, ${groups.length} ratings, ${count} open answers)`)
  return true
}

const browser = await chromium.launch({ headless: args.headless !== 'false' })
for (let i = 0; i < visitors; i++) {
  const visitorId = `demo-visitor-${String(offset + i).padStart(3, '0')}`
  const context = await browser.newContext()
  const page = await context.newPage()
  page.on('pageerror', (e) => console.log(`  page error: ${e.message}`))
  console.log(`[${mode}] ${visitorId}`)
  try {
    await signIn(page, visitorId)
    if (answerSurvey) await answer(page, i)
    await browse(page)
    await applyPromo(page)
    await page.waitForTimeout(2500)
  } catch (e) {
    console.log(`  failed: ${e.message}`)
  }
  await context.close()
}
await browser.close()
