# Requirements Document

## Introduction

The Stock Intrinsic Value calculator currently shows a single snapshot of a company's
fundamentals (latest P/E, ROE, margins, etc.). Long-term investors care far more about
*trends* — is the business growing revenue and earnings consistently, are margins
expanding or compressing, is ROE durable, is the company taking on debt, is it being
re-rated up or down on P/E.

This feature adds a **Historical Fundamentals Dashboard** to the stock analysis page:
a set of clean, at-a-glance charts of key financial metrics over time, defaulting to a
5-year window with an option to switch to 10 years (and "Max" where data allows). The
goal is that a long-term investor can open a stock and understand the quality and
trajectory of the business in seconds, without leaving the app or reading raw tables.

We take inspiration from how strong tools (e.g. AlphaSpread) present fundamentals — clear
per-metric charts, growth rates, and visual trend cues — but design our own layout and
emphasis rather than copying.

## Glossary

- **TTM**: Trailing Twelve Months.
- **CAGR**: Compound Annual Growth Rate.
- **Annual data point**: One fiscal year's reported value.
- **Window**: The selected look-back period (5Y, 10Y, or Max).

## Requirements

### Requirement 1: Historical metric charts

**User Story:** As a long-term investor, I want to see key fundamental metrics plotted
over time, so that I can judge the consistency and direction of the business at a glance.

#### Acceptance Criteria
1. WHEN a stock analysis result is displayed THEN the system SHALL render a
   "Financial History" section containing per-metric charts.
2. The system SHALL provide charts for at least the following metrics where data is
   available: Revenue, Net Income, EPS, Gross/Operating/Net Margin, ROE, Free Cash Flow,
   Total Debt, Dividend Per Share, P/E ratio, and PEG ratio.
3. WHEN a metric's historical data is unavailable for the stock THEN the system SHALL hide
   that metric's chart and SHALL NOT render an empty or broken chart.
4. WHERE a metric is a flow measure (Revenue, Net Income, FCF, Dividend) the system SHALL
   render it as a bar chart; WHERE a metric is a ratio/percentage (Margins, ROE, P/E, PEG)
   the system SHALL render it as a line chart.
5. Each chart SHALL display the metric name, the latest value, and the period CAGR (for
   flow metrics) or the change over the window (for ratio metrics).

### Requirement 2: Selectable time window

**User Story:** As an investor, I want to switch between 5-year and 10-year views, so that
I can see both recent performance and longer-term track record.

#### Acceptance Criteria
1. WHEN the Financial History section is displayed THEN the system SHALL default to a
   5-year window.
2. The system SHALL provide a control to switch the window between 5 Years, 10 Years, and
   Max (all available history).
3. WHEN the user changes the window THEN the system SHALL update all charts in the section
   to the selected window without requiring a new stock search.
4. IF fewer years of data are available than the selected window THEN the system SHALL
   display all available years and SHALL indicate that the full window was not available.

### Requirement 3: At-a-glance quality summary

**User Story:** As a busy investor, I want a quick summary of the company's track record,
so that I can form an impression without studying every chart.

#### Acceptance Criteria
1. WHEN the Financial History section renders THEN the system SHALL display a summary strip
   with revenue CAGR, earnings CAGR, average ROE, and margin trend over the selected window.
2. WHERE a trend is positive (e.g. expanding margins, rising ROE) the system SHALL use a
   positive visual cue (color/arrow); WHERE negative, a cautionary cue.
3. The summary SHALL update when the time window changes.

### Requirement 4: Data sourcing and reliability

**User Story:** As a user, I want the historical data to be trustworthy and clearly
labeled, so that I know what I'm looking at.

#### Acceptance Criteria
1. The system SHALL source historical fundamentals from the backend finance proxy (no
   direct third-party calls from the browser).
2. WHEN historical fundamental data cannot be retrieved THEN the system SHALL show a clear,
   non-blocking message and SHALL still render the rest of the analysis page.
3. The system SHALL label each chart's data basis (annual) and the fiscal period coverage
   (e.g. "FY2021–FY2025").
4. WHERE derived ratios are computed by the app (e.g. historical P/E from price and EPS)
   the system SHALL treat them as estimates and label them accordingly.

### Requirement 5: Performance and responsiveness

**User Story:** As a user, I want the dashboard to load quickly and work on mobile, so that
it is usable in everyday research.

#### Acceptance Criteria
1. WHEN a stock is analyzed THEN the system SHALL fetch historical fundamentals once and
   reuse the data when the user toggles the time window (no refetch for 5Y↔10Y if Max data
   is already loaded).
2. The system SHALL render charts responsively, adapting layout and tick density for small
   screens.
3. IF the historical data request is slow THEN the system SHALL not block the primary
   valuation result from displaying.

### Requirement 6: Consistency with existing design

**User Story:** As a user, I want the new section to feel like part of the same app.

#### Acceptance Criteria
1. The system SHALL use the existing MUI theme, card/accordion styling, and the existing
   charting library (Recharts).
2. The system SHALL format currency values using the stock's reporting currency, consistent
   with the rest of the analysis page.
