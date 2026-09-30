import { chromium } from '@playwright/test'

// Simulates a survey that visitors open but do not finish: a share of visitors rate step 1 and
// advance, then close the guide on step 2 instead of answering; the rest close it on step 1.
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=')
    return [k, v]
  })
)
const base = args.base || 'http://localhost:5173'
const guideId = args.guide
const visitors = Number(args.visitors || 20)
const offset = Number(args.offset || 200)
const advanceRatio = Number(args.advance || 0.7)
const finishEvery = Number(args.finish || 0)
if (!guideId) {
  console.error('usage: node scripts/dropoff.mjs --guide=<pendo guide id> [--visitors=20] [--offset=200] [--advance=0.7] [--finish=0]')
  process.exit(1)
}

const GUIDE = '#pendo-base'

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

async function dismissOtherGuides(page) {
  for (let i = 0; i < 6; i++) {
    const shown = await page.locator(GUIDE).count()
    if (!shown) return
    await page.evaluate(() => window.pendo.onGuideDismissed())
    await page.waitForTimeout(700)
  }
}

async function showGuide(page) {
  await dismissOtherGuides(page)
  await page.evaluate((id) => window.pendo.showGuideById(id), guideId)
  await page.locator(`${GUIDE} input.pendo-radio`).first().waitFor({ state: 'attached', timeout: 20000 })
  await page.waitForTimeout(500)
}

async function pickRating(page, groupName, rating) {
  const radio = page.locator(`${GUIDE} input.pendo-radio[name="${groupName}"]`).nth(rating - 1)
  const id = await radio.getAttribute('id')
  const label = page.locator(`${GUIDE} label[for="${id}"]`)
  if (await label.count()) await label.first().click()
  else await radio.check({ force: true })
}

async function rateStep(page, index) {
  const groups = await page.$$eval(`${GUIDE} input.pendo-radio`, (els) => [...new Set(els.map((e) => e.name))])
  const ratings = [4, 5, 3, 4]
  for (const [i, name] of groups.entries()) {
    await pickRating(page, name, ratings[(index + i) % ratings.length])
    await page.waitForTimeout(200)
  }
}

async function next(page) {
  const button = page.locator(`${GUIDE} button`).filter({ hasText: /^(next|submit)$/i }).first()
  await button.click()
  await page.waitForTimeout(900)
}

async function closeGuide(page) {
  const close = page.locator(`${GUIDE} ._pendo-close-guide, ${GUIDE} [class*="close-guide"]`).first()
  if (await close.count()) await close.click().catch(() => {})
  else await page.evaluate(() => window.pendo.onGuideDismissed())
  await page.waitForTimeout(700)
}

async function finish(page) {
  const textareas = page.locator(`${GUIDE} textarea`)
  const count = await textareas.count()
  for (let i = 0; i < count; i++) await textareas.nth(i).fill(i === 0 ? 'Settings were easy to find.' : 'Fewer questions.')
  await next(page)
  const done = page.locator(`${GUIDE} button`).filter({ hasText: /^(done|finish|close|submit)$/i }).first()
  if (await done.count()) await done.click().catch(() => {})
  await page.waitForTimeout(700)
}

const browser = await chromium.launch({ headless: args.headless !== 'false' })
let advanced = 0
let finished = 0
for (let i = 0; i < visitors; i++) {
  const visitorId = `demo-visitor-${String(offset + i).padStart(3, '0')}`
  const context = await browser.newContext()
  const page = await context.newPage()
  console.log(`[dropoff] ${visitorId}`)
  try {
    await signIn(page, visitorId)
    await showGuide(page)
    if (i / visitors < advanceRatio) {
      await rateStep(page, i)
      await next(page)
      advanced++
      if (finishEvery > 0 && advanced % finishEvery === 0) {
        await finish(page)
        finished++
        console.log('  rated step 1, finished the survey')
      } else {
        await closeGuide(page)
        console.log('  rated step 1, closed on step 2')
      }
    } else {
      await closeGuide(page)
      console.log('  closed on step 1')
    }
    await page.waitForTimeout(2000)
  } catch (e) {
    console.log(`  failed: ${e.message}`)
  }
  await context.close()
}
console.log(`advanced ${advanced}/${visitors}, finished ${finished}`)
await browser.close()
