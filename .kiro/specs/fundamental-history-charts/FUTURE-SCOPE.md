# Future Scope & Status

## Completed in this session

- **Fundamental History Dashboard** (this spec, tasks 1–6): backend time-series proxy,
  client service + calc utils, `MetricChart`, `HistorySummaryStrip`, `FinancialHistory`
  container, integrated into the analysis page. All files verified clean via diagnostics.
- **Business Quality Score** (0–100) added to the valuation engine + `QualityScoreCard`.
- **Watchlist** with multi-stock table, CSV import/export, sortable columns, localStorage
  persistence, and click-through to the detailed analysis (symbol via router state).

## Not completed — moved to future scope

### 1. Automated tests (spec task 7)
- Unit tests for `fundamentalsHistory.ts` (CAGR, historical P/E edge cases), `watchlist.ts`
  (CSV parsing variants), and the backend time-series normalizer; a component test for
  `FinancialHistory`.
- **Why deferred:** the sandbox shell could not reliably run the test runner / installs.
  The code is pure-function-heavy and structured for easy testing later.

### 2. Watchlist alerts (idea 5, partial)
- Currently: rows at/below accumulation level are highlighted green, low-confidence rows are
  flagged. **Full alerting** (notifications when price crosses accumulation/exit, email/push)
  is not implemented.

### 3. Live build/test verification
- Verified via the language server (zero diagnostics across all new/changed files). A full
  `npm run build` / `npm test` was not runnable in the sandbox. Note: a **pre-existing**
  `TS2688: testing-library__jest-dom` type error exists in the environment, unrelated to
  these changes — ensure dev dependencies are installed (`pnpm install`) before CI build.

## Additional backlog ideas (from design.md)
1. Peer comparison (multiples/margins vs sector peers)
2. Valuation history band (historical intrinsic vs price shaded zones)
3. Dividend track record (growth streak, payout ratio, yield-on-cost)
4. Shareable/exportable PDF/PNG one-pager (html2canvas already bundled)
5. Saved per-stock assumption scenarios
6. Earnings surprise history (actual vs estimate)

## Verification checklist for when you're back
1. `cd client && pnpm install` (ensures recharts + jest-dom types present)
2. `pnpm start` (client) and `pnpm run api:start` (api) in separate terminals
3. Test: Stock Intrinsic Value page → analyze AAPL/INFY → check scenarios, quality score,
   and the Financial History charts (toggle 5Y/10Y/Max)
4. Test: Watchlist → add a few stocks, import a CSV with a "Symbol" column, sort columns,
   click a row to open analysis
