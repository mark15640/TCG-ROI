# TCG-ROI

A card grading ROI calculator for trading cards. Enter a card's raw Near Mint price and condition, and it shows whether grading beats selling raw with **PSA, CGC, SGC, BGS and TAG**. Every figure is after eBay fees, postage and shipping supplies.

## What it does

The page has two parts. At the top you enter the card: price, condition, and which companies to **Compare**. Select one chip to focus on a single company, or several to compare them. Below that, four tabs hold everything else: **Results**, **Grade odds**, **Prices & tiers** (only for the companies you selected) and **Fees & shipping**.

- **Raw values by condition.** Prices the card as Near Mint, Lightly Played, Moderately Played, Heavily Played or Damaged, and shows what each one nets after eBay.
- **Likely grades.** Each condition fills in a starting set of odds for grades 1–10. You can move the sliders to account for centering, surface and edges.
- **Side-by-side company comparison.** For each grader it shows the service tier, the all-in grading cost per card, the expected sale price, the expected net, the gain versus selling raw, the ROI on grading spend, the chance of beating raw, the break-even grade and the turnaround.
- **Per-grade breakdown.** Click a company to see what each possible grade sells for, what eBay takes, and whether that grade beats the raw sale.
- **Real comps.** Enter actual sold prices per company and grade. Any cell you leave blank uses an estimate (NM price × a per-grade multiplier, which you can also edit).
- **eBay fees.** Final value fee (13.25% up to $7,500, then 2.35%), the per-order fee ($0.30 / $0.40), an optional Promoted Listings rate, and buyer sales tax. eBay charges its fee on the tax-inclusive total.
- **Shipping and supplies.** Separate postage method and supply list for raw cards and for slabs: penny sleeve, toploader, team bag, bubble mailer and so on. You can edit or add items. The eBay Standard Envelope is limited to raw cards selling for $20 or less.
- **Submission costs.** Shipping to the grader and return shipping are split across the cards in the submission, plus card savers.
- **Tier selection.** By default it picks the cheapest tier whose declared-value cap covers the expected graded value. You can also choose a tier yourself.

Inputs are saved in your browser's localStorage. The 🌙 / ☀️ button in the header switches between night and day mode. Until you pick one, it follows your device's setting.

## Website and app

The same build works both as a website and as an installable app (a Progressive Web App). Once it's hosted on HTTPS:

- **iPhone / iPad (Safari):** Share → *Add to Home Screen*
- **Android (Chrome):** menu → *Install app*
- **Windows / Mac (Chrome or Edge):** the install icon in the address bar

The installed app opens in its own window with no browser bar. After the first visit it works offline. It updates itself when a new version is deployed.

### Hosting on GitHub Pages

`.github/workflows/deploy.yml` tests, builds and deploys the site every time `main` is pushed. To turn it on once: go to the repo's **Settings → Pages** and set **Source** to **GitHub Actions**. The site will be at `https://<user>.github.io/<repo>/`.

## How the numbers work

```
raw net        = raw price + shipping charged − eBay fees − postage − supplies
graded net(g)  = same formula at the graded sale price for grade g
grading cost   = tier fee + add-ons + (shipping in + return shipping) / cards per submission + submission supplies
expected gain  = Σ P(g) · graded net(g) − grading cost − raw net
ROI            = expected gain / grading cost
```

## Default values are estimates

Grading fees, turnaround times, postage and grade premiums change often, and premiums vary a lot from card to card. Every default can be edited in the app, and sold comps for your specific card will give much better answers than the default multipliers. Defaults live in `src/lib/data.ts`.

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests for the ROI math
npm run build      # typecheck + production build to dist/
```

Built with React, TypeScript and Vite. The build is a static site, so `dist/` can be hosted anywhere (GitHub Pages, Netlify, Vercel).

## Project layout

- `src/lib/types.ts`: domain types
- `src/lib/data.ts`: conditions, grading companies and tiers, shipping methods, supplies, eBay defaults
- `src/lib/calc.ts`: the ROI engine (pure functions, covered by `calc.test.ts`)
- `src/components/`: UI sections
