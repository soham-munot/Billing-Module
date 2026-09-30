# Billing Module

Demo app for the Sentiment Pulse hackathon: a small billing UI (invoices, payment methods, subscription) instrumented with Pendo, plus a scripted traffic generator that produces a "good week" and a "bad week".

## Run

```sh
npm install
npm run dev            # http://localhost:5173
```

Sign in with any visitor id, email and name; the form calls `pendo.initialize` and routes to Invoices.

## The bad release

`src/billing/promo.js` is where the demo defect lands, as its own pull request: a "promo code validation refactor" that throws on every Apply promo click and changes nothing on screen. Run the good traffic before merging it and the bad traffic after, so the two weeks differ by exactly that change.

## Track events

`visitor_initialized`, `invoice_pdf_downloaded`, `payment_method_added`, `promo_applied`, `plan_upgraded`; `pendo.pageLoad` on every route change. Buttons carry `data-pendo` ids for tagging.

## Traffic

```sh
npx playwright install chromium
npm run traffic:good -- --visitors=15
npm run traffic:bad  -- --visitors=15
```

Options: `--base=<url>`, `--visitors=<n>`, `--offset=<n>` (visitor id start), `--survey=false`, `--headless=false`. Good mode answers the CSAT survey mostly 4 or 5. Bad mode clicks Apply promo five times in a row, then answers mostly 1 or 2 with a complaint about the promo button. Run bad mode only after the bad release is merged.
