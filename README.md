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

With several CSAT surveys published, `--surveys=<n>` answers up to n guides per visitor as Pendo shows them, and `--guide=<guide id>` shows one survey's delivery guide and answers only that one. After the targeted survey is answered, guides are stopped for the session so no other survey's lightbox blocks the flow. `--quotes-good="a|b"` and `--quotes-bad="a|b"` replace the open-answer text.

`--mode` picks the scenario, each with its own flow, complaints and default visitor-id offset:

| Mode | Flow after the survey | Needs |
| --- | --- | --- |
| `good` | browse, apply a promo once | nothing |
| `bad` | click Apply promo five times, then once more | the promo validation refactor (PR #4) served |
| `card` | three cards saved twice each | the card verification change served |
| `invoices` | every invoice downloaded twice, a click on the table header | nothing |
| `plans` | switch plan, go to Invoices and back, twice, switch again | nothing |

Good traffic has to land in an earlier week than the bad traffic for a score drop to register; Pendo events cannot be backdated.

```sh
node scripts/dropoff.mjs --guide=<guide id> --visitors=20 --advance=0.7
```

Simulates a survey visitors abandon: the first `--advance` share of visitors rate step 1, click Next and close the guide on step 2; the rest close it on step 1. `--finish=<n>` completes every nth advancing visitor's survey so the response rate is not exactly zero.
