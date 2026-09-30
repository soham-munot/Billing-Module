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

async function answer(page, index) {
  const guide = page.locator('[id^="pendo-g-"]').first()
  try {
    await guide.waitFor({ timeout: 8000 })
  } catch {
    console.log('  no survey guide shown')
    return
  }
  const positive = mode === 'good' ? index % 5 !== 0 : index % 4 === 0
  const rating = positive ? (index % 2 === 0 ? '5' : '4') : index % 2 === 0 ? '1' : '2'
  await guide.getByRole('button', { name: rating, exact: true }).first().click()
  await page.waitForTimeout(700)
  const textarea = guide.locator('textarea').first()
  if (await textarea.count()) {
    const quotes = QUOTES[positive ? 'good' : 'bad']
    await textarea.fill(quotes[index % quotes.length])
    const next = guide.getByRole('button', { name: /submit|next|done|finish/i }).first()
    if (await next.count()) await next.click()
  }
  await page.waitForTimeout(1500)
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
    await browse(page)
    await applyPromo(page)
    if (answerSurvey) await answer(page, i)
    await page.waitForTimeout(2500)
  } catch (e) {
    console.log(`  failed: ${e.message}`)
  }
  await context.close()
}
await browser.close()
