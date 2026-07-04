# Retirement Planner - Project Context

## Overview

A React-based retirement planning calculator that helps users determine how much monthly SIP (Systematic Investment Plan) they need to achieve their desired retirement pension, considering existing lump sum investments.

**Live URL:** https://akashbadhe.github.io/retirement-planner  
**Authors:** Akash & Amruta

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 (Create React App) |
| Language | TypeScript 4.9 (strict mode) |
| UI Library | Material UI (MUI) v5 |
| Styling | styled-components v6 + @emotion |
| Testing | Jest + React Testing Library |
| Deployment | GitHub Pages (gh-pages) |
| Containerization | Docker (node:14-alpine, served via `serve`) |
| Package Manager | pnpm (also has package-lock.json) |

---

## Project Structure

```
financial-calculators/
├── client/               # React frontend
│   ├── public/           # Static assets, favicon, manifest
│   ├── src/
│   │   ├── index.tsx         # Entry point, renders <App />
│   │   ├── App.tsx           # Root: Router + Header + Pages + Footer
│   │   ├── theme.ts          # MUI theme (finance color palette)
│   │   ├── components/       # Shared UI components
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── SliderInput.tsx
│   │   │   ├── CalculatorSidebar.tsx
│   │   │   ├── RetirementForm.tsx
│   │   │   ├── SipCalculatorForm.tsx
│   │   │   ├── CagrCalculatorForm.tsx
│   │   │   ├── EmiCalculatorForm.tsx
│   │   │   └── SipReturnsCalculatorForm.tsx
│   │   ├── pages/            # Route pages
│   │   ├── data/             # Shared data (calculators list)
│   │   └── services/         # API services (yahooFinance.ts)
│   ├── package.json
│   └── tsconfig.json
├── api/                  # NestJS backend
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── finance/      # Yahoo Finance proxy module
│   │   ├── auth/         # Authentication (ready for future use)
│   │   ├── user/         # User module (ready for future use)
│   │   └── config/       # App configuration
│   ├── package.json
│   └── tsconfig.json
├── terraform/            # Azure infrastructure (IaC)
├── .github/workflows/    # CI/CD (deploy-api.yml, deploy-frontend.yml)
├── .kiro/steering/       # AI context
├── package.json          # Root workspace scripts
└── README.md
```

---

## Application Flow

1. User opens the app → sees Header + Form + Footer
2. Form has 6 input fields with default values:
   - Current Age (default: 32)
   - Retirement Age (default: 42)
   - Monthly Pension Required (default: ₹3,00,000)
   - Pension Tenure in years (default: 30)
   - Expected Annual Returns % (default: 12%)
   - Existing Investments / Lump Sum (default: ₹1,00,00,000)
3. Calculation runs reactively via `useEffect` on any input change
4. User clicks "Calculate" → results panel appears with smooth scroll
5. Results show either:
   - **Monthly SIP required** (if lump sum is insufficient)
   - **Excess amount available** at retirement + its future value (if lump sum is sufficient)

---

## Core Calculation Logic (in `RetirementForm.tsx`)

### Function: `calculateRequiredSIP`

**Inputs:**
- `sipPeriodYears` — years until retirement (retirementAge - currentAge)
- `monthlyPensionRequirement` — desired monthly pension
- `lumpSumAmount` — existing investments
- `withdrawalPeriodYears` — pension tenure (how long pension is needed)
- `expectedReturnsPercent` — annual expected return rate

**Steps:**

1. **Future Value of Lump Sum (FVLumpSum):**
   ```
   FVLumpSum = lumpSum × (1 + annualRate)^sipPeriodYears
   ```

2. **Total Future Value Needed (FVTotal) — present value of annuity at retirement:**
   ```
   FVTotal = monthlyPension × [(1 - (1 + monthlyRate)^(-withdrawalMonths)) / monthlyRate] × (1 + monthlyRate)
   ```

3. **Adjusted FV Needed:**
   ```
   adjustedFVNeeded = FVTotal - FVLumpSum
   ```

4. **If adjustedFVNeeded > 0** → Calculate required monthly SIP:
   ```
   SIP = adjustedFVNeeded / [((1 + monthlyRate)^sipMonths - 1) / monthlyRate × (1 + monthlyRate)]
   ```

5. **If adjustedFVNeeded ≤ 0** → Lump sum is more than enough. Calculate excess and its future value over the withdrawal period.

**Outputs:**
- `sipAmount` — monthly SIP needed (0 if lump sum suffices)
- `extraAmountAtStartOfRetirement` — surplus at retirement
- `futuralValueOfExtraAmount` — growth of surplus over pension tenure

---

## Key Components

### `RetirementForm.tsx`
- Contains ALL state management and calculation logic
- Uses `useState` for each form field and calculated results
- Uses `useEffect` to auto-recalculate on input changes
- Uses `useRef` for scroll-to-results behavior
- `formatAmount()` helper: formats numbers into Cr/Lac/raw format (Indian numbering)
- `getCalculations()` renders the result JSX conditionally

### `Header.tsx`
- Simple styled div with gradient background (blue radial)
- Displays "Retirement Planning Calculator"

### `Footer.tsx`
- Fixed-position bottom footer with gradient
- Shows copyright year + author names

### `LineSeparator.tsx`
- Reusable "OR" divider with horizontal lines
- Currently not used in the main app flow

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm start` | Start dev server (port 3000) |
| `pnpm build` | Production build |
| `pnpm test` | Run tests (Jest) |
| `pnpm run deploy` | Deploy to GitHub Pages |

---

## Testing

- **App.test.tsx** — Verifies Header renders
- **Footer.test.tsx** — Verifies copyright year and author text
- **RetirementForm.test.tsx** — Tests input rendering, value changes, and calculate button showing results

---

## Styling Approach

- Components use `styled-components` for scoped styling
- MUI components (`TextField`, `Button`, `Paper`, `Container`, `CssBaseline`) for form elements
- Global styles in `src/index.css` (font, margin reset)
- Roboto font loaded via `@fontsource/roboto`
- Color theme: Blue gradient (`rgb(63, 201, 251)` primary)

---

## Notes for Development

- The calculation logic is entirely client-side with no backend/API
- No routing — single page application with one view
- State is not persisted (no localStorage, no URL params)
- All monetary values assume Indian Rupee (₹) with Cr/Lac formatting
- Docker setup uses `serve` for static file hosting on port 5000
- The `App.scss` file exists but is empty/unused

---

## Stock Analysis Suite (added)

Beyond the basic calculators, the app now has a stock research suite:

### Stock Intrinsic Value Calculator (`/stock-intrinsic-value`)
- `components/StockIntrinsicValueForm.tsx` + `pages/StockIntrinsicValuePage.tsx`
- Valuation engine in `services/valuation.ts`:
  - **DCF** (FCF-based, discounted at WACC via CAPM) with an **earnings-based fallback**
    (discounted at cost of equity) for banks/financials where FCF isn't meaningful.
  - **Relative valuation** from quality-adjusted sector multiples (P/E, EV/EBITDA weighted
    higher than P/S, P/B), aggregated robustly (median + outlier trim).
  - **Intrinsic value = average(DCF, Relative)**, AlphaSpread-style.
  - **Bear / Base / Bull scenarios** (`calculateScenarios`) varying growth.
  - **Confidence assessment** (`assessConfidence`) + **business quality score** (0–100).
- Region-aware assumptions (risk-free rate, ERP, tax, terminal growth) keyed by currency.
- Visuals: `ValuationGauge`, `QualityScoreCard`, scenario toggle, price-vs-intrinsic chart.

### Financial History Dashboard
- `components/history/FinancialHistory.tsx` (+ `MetricChart`, `HistorySummaryStrip`)
- Backend: `GET /api/finance/fundamentals-history` proxies Yahoo's fundamentals
  time-series; `services/fundamentalsHistory.ts` has the calc utils (CAGR, P/E, etc.).
- 5Y default, 10Y/Max toggle; charts for revenue, income, margins, ROE, FCF, debt, P/E.
- Spec: `.kiro/specs/fundamental-history-charts/`.

### Watchlist (`/watchlist`)
- `components/WatchlistTable.tsx` + `pages/WatchlistPage.tsx`
- Add/search stocks, **CSV import/export**, sortable table of intrinsic value, upside,
  signal, quality, P/E, ROE across all holdings. Persisted in localStorage
  (`services/watchlist.ts`). Row click opens the detailed analysis (symbol passed via
  router state). Multi-symbol valuation via `services/quickValuation.ts`.

### Dependencies
- Charts use **recharts**. No CSV library — `services/watchlist.ts` has a small CSV parser.

### Backend finance proxy notes
- Yahoo `quoteSummary` and `fundamentals-timeseries` require a **crumb + cookie**;
  `FinanceService.refreshCrumb()` handles this. The finance controller is `@Public()`.
