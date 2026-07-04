# Implementation Plan — Historical Fundamentals Dashboard

## Overview

This plan implements the Historical Fundamentals Dashboard in incremental, test-backed
steps: backend time-series proxy first, then client data/calculation services, then the
reusable chart and summary components, then container + integration, and finally tests and
build verification.

## Tasks

- [x] 1. Backend: add fundamentals time-series proxy
  - [x] 1.1 Add `getFundamentalsHistory(symbol, years)` to `api/src/finance/finance.service.ts`
    - Reuse `refreshCrumb()` for cookie/crumb auth
    - Build the time-series URL with the annual `type` keys and computed `period1`
    - Parse Yahoo `timeseries.result[]` tolerantly into normalized series (skip missing)
    - Derive margins (gross/operating/net) and ROE server-side
    - Return the `FundamentalsHistoryResponse` shape with `coverage`
    - _Requirements: 4.1, 4.3, 1.2, 1.3_
  - [x] 1.2 Add `GET /api/finance/fundamentals-history` to `finance.controller.ts`
    - `@Public()`, validate `symbol`, default/clamp `years` to {5,10,max}
    - _Requirements: 4.1, 2.2_

- [x] 2. Frontend: client data service
  - [x] 2.1 Add `fetchFundamentalsHistory(symbol, years)` to `client/src/services/yahooFinance.ts`
    - Reuse `formatSymbol`; type the `FundamentalsHistoryResponse`
    - _Requirements: 4.1, 5.1_
  - [x] 2.2 Create `client/src/services/fundamentalsHistory.ts` calc utilities
    - `cagr`, `marginTrend`, `computeHistoricalPE`, `computePEG` with guards
    - _Requirements: 1.5, 3.1, 4.4_

- [x] 3. Frontend: reusable chart component
  - [x] 3.1 Create `client/src/components/history/MetricChart.tsx`
    - Props: title, data, type (`bar`|`line`), valueFormat, currency
    - Header shows latest value + CAGR/change; Recharts bar or line; responsive
    - _Requirements: 1.4, 1.5, 5.2, 6.1, 6.2_

- [x] 4. Frontend: summary strip
  - [x] 4.1 Create `client/src/components/history/HistorySummaryStrip.tsx`
    - Revenue CAGR, EPS CAGR, avg ROE, margin trend with up/down color cues
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 5. Frontend: container + window toggle
  - [x] 5.1 Create `client/src/components/history/FinancialHistory.tsx`
    - Fetch `Max` once on mount per symbol; slice client-side for 5Y/10Y
    - Own window state (default 5Y); `ToggleButtonGroup` for 5Y/10Y/Max
    - Compute historical P/E from passed-in `priceHistory` + EPS series
    - Loading/error/empty states; coverage indicator when window not fully available
    - Render `HistorySummaryStrip` + responsive `MetricChart` grid
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.2, 5.1, 5.3, 6.1_

- [x] 6. Integrate into the analysis page
  - [x] 6.1 Render `<FinancialHistory>` in `StockIntrinsicValueForm.tsx`
    - Place below Fundamental Analysis; pass `symbol`, `result.currency`, and the
      already-fetched daily price history (avoid a second price fetch)
    - _Requirements: 5.1, 5.3, 6.2_

- [ ] 7. Tests and verification
  - [ ] 7.1 Backend unit test for the time-series normalizer using a captured fixture
    - Tolerant parsing, missing series, margin/ROE derivation, `years` clamping
    - _Requirements: 1.3, 4.3_
  - [ ] 7.2 Frontend unit tests for `fundamentalsHistory.ts` utilities
    - CAGR edge cases (zero/negative base), historical P/E with negative EPS, short history
    - _Requirements: 1.5, 3.1, 4.4_
  - [ ] 7.3 Component test for `FinancialHistory`
    - Charts shown for present series / hidden for absent; window toggle re-slices; summary updates
    - _Requirements: 1.3, 2.3, 3.3_
  - [ ] 7.4 Run client build and API build; fix any issues
    - _Requirements: all_

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1.1"] },
    { "wave": 2, "tasks": ["1.2", "7.1"] },
    { "wave": 3, "tasks": ["2.1"] },
    { "wave": 4, "tasks": ["2.2", "3.1", "4.1"] },
    { "wave": 5, "tasks": ["5.1", "7.2"] },
    { "wave": 6, "tasks": ["6.1"] },
    { "wave": 7, "tasks": ["7.3"] },
    { "wave": 8, "tasks": ["7.4"] }
  ]
}
```

```
1.1 ─▶ 1.2 ─▶ 2.1 ─┬─▶ 5.1 ─▶ 6.1 ─▶ 7.3 ─▶ 7.4
              2.2 ─┤   ▲
              3.1 ─┤   │
              4.1 ─┘   │
              2.2 ─▶ 7.2 ──────────────┘
1.1 ─▶ 7.1
```

- Backend (1.1 → 1.2) must land before the client service (2.1).
- Calc utilities (2.2), chart (3.1), and summary (4.1) can proceed in parallel after 2.1.
- Container (5.1) depends on 2.1, 2.2, 3.1, 4.1; integration (6.1) depends on 5.1.
- Tests (7.1 backend, 7.2 utils) can be written alongside their targets; 7.3 after 5.1/6.1.

## Notes

- 10Y/Max history is best-effort on free Yahoo; the UI must indicate available coverage.
- Reuse the existing crumb/cookie auth and the daily price history already loaded on the
  analysis page (do not add a second price fetch).
- Keep ratio derivation that needs price history on the client; keep margins/ROE on the
  server for a tidy payload.
