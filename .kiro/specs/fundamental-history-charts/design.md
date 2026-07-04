# Design — Historical Fundamentals Dashboard

## Overview

Add a "Financial History" section to the stock analysis page that renders per-metric
historical charts (5Y default, 10Y/Max optional) plus an at-a-glance quality summary.

The work spans:
- **Backend (NestJS finance module):** a new endpoint that proxies Yahoo Finance's
  fundamentals time-series API and returns a normalized, charting-friendly payload.
- **Frontend client service:** a function to fetch + shape the historical data.
- **Frontend UI:** a `FinancialHistory` component (with sub-components for the summary
  strip and individual metric charts) embedded in the existing analysis result.

## Architecture

The feature follows the existing layered flow of the app:

```
Browser (React)
  └─ FinancialHistory component
       └─ client service: fetchFundamentalsHistory()  ── HTTP ──▶  NestJS API
                                                                     └─ FinanceService.getFundamentalsHistory()
                                                                          └─ Yahoo fundamentals-timeseries (crumb/cookie auth)
```

- All third-party access stays server-side in the NestJS finance proxy (consistent with
  the existing `/finance/chart`, `/finance/fundamentals` endpoints).
- The browser fetches a single normalized payload (`Max` window) once per symbol and slices
  it client-side for 5Y/10Y to avoid refetching.
- Derived ratio series that need price history (historical P/E) are computed in the browser,
  reusing the daily price history already loaded for the price-vs-intrinsic chart.

## Data Sourcing

### Primary source — Yahoo fundamentals time-series
Endpoint (server-side, with the existing crumb/cookie handling):
```
https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/{symbol}
  ?type=annualTotalRevenue,annualNetIncome,annualDilutedEPS,annualGrossProfit,
        annualOperatingIncome,annualTotalAssets,annualStockholdersEquity,
        annualFreeCashFlow,annualTotalDebt,annualCashDividendsPaid,...
  &period1={epochStartFarBack}&period2={now}
```
Notes / constraints:
- Free Yahoo access typically returns ~4–5 years of annual data reliably; deeper history
  (10Y) is inconsistent. The design treats 10Y/Max as best-effort and degrades gracefully
  (Requirement 2.4, 4.2).
- Some `type` keys vary by company (banks lack gross profit, etc.). The normalizer must be
  tolerant of missing series.

### Derived series (computed in the normalizer)
- **Margins:** grossMargin = grossProfit/revenue; operatingMargin = operatingIncome/revenue;
  netMargin = netIncome/revenue.
- **ROE:** netIncome / stockholdersEquity (per fiscal year).
- **Historical P/E (estimate):** for each fiscal year, price near fiscal year-end ÷ that
  year's diluted EPS. Year-end price comes from the existing chart/price history. Labeled
  as an estimate (Requirement 4.4).
- **PEG (estimate):** trailing P/E ÷ earnings growth; only meaningful where earnings grow.

### Existing infrastructure reused
- The `FinanceService.refreshCrumb()` cookie/crumb mechanism already added for the
  quoteSummary endpoint is reused for the time-series endpoint.
- Historical daily prices are already available via `/finance/chart`; the year-end price
  for the P/E series is derived from that.

## Backend Design

### New endpoint
`GET /api/finance/fundamentals-history?symbol={symbol}&years={5|10|max}`

Controller (`finance.controller.ts`):
- Mark `@Public()` (consistent with the rest of the finance controller).
- Validate `symbol`. `years` optional, default `5`, clamp to allowed set.

Service (`finance.service.ts`):
- `getFundamentalsHistory(symbol, years)`:
  1. Ensure crumb/cookie via `refreshCrumb()`.
  2. Compute `period1` from `years` (or far back for `max`).
  3. Request the time-series with the full `type` list.
  4. Parse Yahoo's `timeseries.result[]` into a map of `{ seriesKey: [{ date, value }] }`.
  5. Return the raw normalized series; ratio/margin derivation can happen client-side to
     keep the server thin, OR server-side for a single tidy payload. **Decision:** derive
     margins/ROE server-side (cheap, keeps client simple); leave historical P/E to the
     client since it needs price history already loaded there.

### Response shape
```ts
interface FundamentalsHistoryResponse {
  symbol: string;
  currency: string;
  fiscalYears: number[];            // e.g. [2021, 2022, 2023, 2024, 2025]
  series: {
    revenue?: YearValue[];
    netIncome?: YearValue[];
    eps?: YearValue[];
    grossMargin?: YearValue[];      // percent
    operatingMargin?: YearValue[];  // percent
    netMargin?: YearValue[];        // percent
    roe?: YearValue[];              // percent
    freeCashFlow?: YearValue[];
    totalDebt?: YearValue[];
    dividendPerShare?: YearValue[];
  };
  coverage: { from: number; to: number; requestedYears: number; availableYears: number };
}
interface YearValue { year: number; value: number; }
```

## Components and Interfaces

### Client service (`services/yahooFinance.ts`)
- `fetchFundamentalsHistory(symbol, years): Promise<FundamentalsHistoryResponse>`
- Symbol formatting reuses `formatSymbol`.

### Components
```
FinancialHistory (container)
├── HistoryWindowToggle        // 5Y / 10Y / Max
├── HistorySummaryStrip        // revenue CAGR, EPS CAGR, avg ROE, margin trend
└── MetricChartGrid
    └── MetricChart (xN)        // one per available metric
```

- **FinancialHistory**: receives `symbol`, `currency`, and the already-loaded daily price
  history (for the P/E series). Owns window state and the fetched dataset. Fetches `Max`
  once and slices client-side for 5Y/10Y to satisfy Requirement 5.1.
- **HistoryWindowToggle**: MUI `ToggleButtonGroup` (5Y default).
- **HistorySummaryStrip**: computes and displays revenue CAGR, EPS CAGR, average ROE, and
  margin trend (latest vs first) with up/down color cues (Requirement 3).
- **MetricChart**: a reusable Recharts chart. Props: title, data, type (`bar`|`line`),
  valueFormat (`currency`|`percent`|`ratio`), currency. Shows latest value + CAGR/change
  in the header.
- **MetricChartGrid**: responsive MUI `Grid` (2 columns desktop, 1 column mobile).

### Integration point
`StockIntrinsicValueForm` renders `<FinancialHistory symbol={...} currency={result.currency}
priceHistory={...} />` below the existing Fundamental Analysis section. The price history
already fetched for the price-vs-intrinsic chart is passed down (no extra price fetch).

### Calculations (client utilities in `services/fundamentalsHistory.ts`)
- `cagr(first, last, years)` = (last/first)^(1/years) − 1, guarded for non-positive values.
- `marginTrend(series)` = latest − first (percentage points).
- `computeHistoricalPE(priceHistory, epsSeries)` → `YearValue[]` (year-end price ÷ EPS).
- `computePEG(pe, epsCagr)` where epsCagr > 0.

## Correctness Properties

### Property 1: Window slicing is lossless
Slicing the `Max` dataset to 5Y/10Y SHALL return exactly the trailing N fiscal years
present in the data, never fabricated years.

**Validates: Requirements 2.3, 2.4**

### Property 2: Missing series never render
A metric with no data points SHALL NOT produce a chart.

**Validates: Requirements 1.3**

### Property 3: CAGR guards
CAGR SHALL return `null`/hidden when the base value is ≤ 0 or fewer than 2 data points
exist (no NaN/Infinity displayed).

**Validates: Requirements 1.5, 3.1**

### Property 4: Currency consistency
Every currency-valued figure SHALL use the stock's reporting currency, matching the rest of
the analysis page.

**Validates: Requirements 6.2**

### Property 5: Non-blocking
Failure or slowness of the history fetch SHALL NOT prevent the primary valuation result
from rendering.

**Validates: Requirements 4.2, 5.3**

## Data Models

(See response shape above. The client mirrors these interfaces in
`services/fundamentalsHistory.ts`.)

## Error Handling
- Backend: on Yahoo failure, throw `HttpException(BAD_GATEWAY)` with a clear message; never
  leak crumb/cookie internals.
- Frontend: `FinancialHistory` manages its own loading/error state. On error it shows a
  small inline `Alert` ("Historical fundamentals are unavailable for this stock") and the
  rest of the analysis page is unaffected (Requirement 4.2, 5.3).
- Missing series → that `MetricChart` is not rendered (Requirement 1.3).

## Testing Strategy
- **Backend:** unit-test the normalizer with a captured Yahoo time-series fixture (tolerant
  parsing, missing series, margin/ROE derivation). Test the endpoint validates `symbol` and
  clamps `years`.
- **Frontend utilities:** unit-test `cagr`, `marginTrend`, `computeHistoricalPE`, `computePEG`
  with edge cases (negative earnings, zero base, short history).
- **Component:** render `FinancialHistory` with mock data; assert charts appear for present
  series, hidden for absent ones, window toggle re-slices data, summary updates.
- Run the client build/test and backend build after implementation.

## Rollout / Risk Notes
- Yahoo's unofficial endpoints can change shape; the tolerant normalizer and graceful
  degradation contain this risk.
- 10Y/Max data may be sparse on free Yahoo; UI clearly indicates available coverage rather
  than implying full history.

## Future Enhancement Ideas (not in scope, captured for backlog)
1. **Peer comparison**: compare key multiples/margins against 2–3 sector peers.
2. **Valuation history band**: overlay historical intrinsic-value estimates vs price (extends
   the existing price-vs-intrinsic chart with shaded under/over-valued zones over time).
3. **Dividend track record**: dividend growth streak, payout ratio trend, yield-on-cost.
4. **Quality score**: a composite 0–100 score from ROE durability, margin stability, debt
   trend, and FCF consistency — a single at-a-glance quality gauge.
5. **Watchlist + alerts**: save stocks, alert when price crosses the accumulation/exit level.
6. **Shareable/exportable report**: PNG/PDF one-pager (the app already bundles html2canvas).
7. **Scenario notes**: let the user save their own growth/discount assumptions per stock.
8. **Earnings surprise history**: actual vs estimate EPS over recent quarters.
