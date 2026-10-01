import { chromium } from '@playwright/test'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=')
    return [k, v]
  })
)
const SCENARIOS = {
  good: {
    offset: 0,
    quotes: ['Quick and clear.', 'Promo worked first time.', 'Easy to find my invoices.', 'Smooth checkout.'],
  },
  bad: {
    offset: 100,
    quotes: [
      'The promo code button does nothing.',
      'Clicked apply promo five times, nothing happened.',
      'Could not apply my discount code.',
      'Apply promo is broken, very annoying.',
    ],
  },
  card: {
    offset: 400,
    quotes: [
      'Save card spins for a while then says could not verify card, tried a Visa and a Mastercard.',
      'Every time I save a card the form wipes my details and shows verification failed.',
      'Cannot add our corporate Amex, keeps failing at the verification step so we cannot pay.',
      'Adding a payment method used to take ten seconds, now it just errors out.',
    ],
  },
  invoices: {
    offset: 500,
    quotes: [
      'Month end again and I had to download every invoice one at a time, please give us a single export.',
      'No way to export all invoices as a CSV for our accounting team.',
      'Downloading invoices one by one is tedious, a select all would help.',
    ],
  },
  plans: {
    offset: 600,
    quotes: [
      'Clicked Switch plan and it changed instantly with no confirmation or price preview.',
      'There is no way to see what I will actually pay this cycle before switching plans.',
      'Moved down a plan and the invoice still shows the old amount, no credit anywhere.',
      'Switching plans is a one click surprise, show me the charge before you take it.',
    ],
  },
}
const mode = args.mode in SCENARIOS ? args.mode : 'good'
const scenario = SCENARIOS[mode]
const base = args.base || 'http://localhost:5173'
const visitors = Number(args.visitors || 15)
const offset = Number(args.offset || scenario.offset)
const answerSurvey = args.survey !== 'false'
const surveys = Number(args.surveys || 1)
const guideId = args.guide

const QUOTES = { good: SCENARIOS.good.quotes, bad: scenario.quotes }
if (args['quotes-good']) QUOTES.good = args['quotes-good'].split('|')
if (args['quotes-bad']) QUOTES.bad = args['quotes-bad'].split('|')

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

async function hammerSaveCard(page) {
  await page.getByRole('link', { name: 'Payment methods' }).click()
  const save = page.locator('[data-pendo="save-card"]')
  for (const number of ['4242 4242 4242 4242', '5555 5555 5555 4444', '3782 822463 10005']) {
    await page.locator('[data-pendo="card-number"]').fill(number)
    await page.locator('[data-pendo="card-name"]').fill('Demo Visitor')
    await page.locator('[data-pendo="card-expiry"]').fill('12/28')
    await save.click({ noWaitAfter: true })
    await page.waitForTimeout(400)
    await save.click({ noWaitAfter: true })
    await page.waitForTimeout(1200)
  }
}

async function downloadEveryInvoice(page) {
  const buttons = page.locator('[data-pendo="invoice-download-pdf"]')
  const count = await buttons.count()
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < count; i++) {
      await buttons.nth(i).click()
      await page.waitForTimeout(500)
    }
  }
  await page.locator('thead th').first().click().catch(() => {})
  await page.waitForTimeout(800)
}

async function switchPlansBackAndForth(page) {
  for (let i = 0; i < 2; i++) {
    await page.getByRole('link', { name: 'Subscription' }).click()
    await page.waitForTimeout(700)
    const switchButton = page.locator('[data-pendo="upgrade-plan"]').first()
    await switchButton.click()
    await page.waitForTimeout(900)
    await page.getByRole('link', { name: 'Invoices' }).click()
    await page.waitForTimeout(900)
  }
  await page.getByRole('link', { name: 'Subscription' }).click()
  await page.locator('[data-pendo="upgrade-plan"]').first().click()
  await page.waitForTimeout(900)
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

async function answer(page, index, timeout) {
  const guide = page.locator(GUIDE)
  const started = Date.now()
  try {
    await guide.locator('input.pendo-radio').first().waitFor({ state: 'attached', timeout })
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
  await page.locator(`${GUIDE} input.pendo-radio`).first().waitFor({ state: 'detached', timeout: 10000 }).catch(() => {})
  return true
}

async function dismissGuides(page) {
  for (let i = 0; i < 6 && (await page.locator(GUIDE).count()); i++) {
    await page.evaluate(() => window.pendo.onGuideDismissed())
    await page.waitForTimeout(700)
  }
}

async function stopGuides(page) {
  await dismissGuides(page)
  await page.evaluate(() => window.pendo.stopGuides())
}

async function showGuide(page) {
  await dismissGuides(page)
  await page.evaluate((id) => window.pendo.showGuideById(id), guideId)
}

async function answerAll(page, index) {
  if (guideId) {
    await showGuide(page)
    await answer(page, index, 20000)
    return
  }
  for (let n = 0; n < surveys; n++) {
    if (!(await answer(page, index + n, n === 0 ? 45000 : 20000))) return
  }
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
    if (answerSurvey) await answerAll(page, i)
    await stopGuides(page)
    if (mode === 'card') await hammerSaveCard(page)
    else if (mode === 'invoices') await downloadEveryInvoice(page)
    else if (mode === 'plans') await switchPlansBackAndForth(page)
    else {
      await browse(page)
      await applyPromo(page)
    }
    await page.waitForTimeout(2500)
  } catch (e) {
    console.log(`  failed: ${e.message}`)
  }
  await context.close()
}
await browser.close()
