import React, { useEffect, useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  fetchFundamentalsHistory,
  FundamentalsHistoryResponse,
  YearValue,
} from '../../services/yahooFinance';
import {
  sliceYears,
  cagr,
  changeOverWindow,
  computeHistoricalPE,
  HistoricalPricePoint,
} from '../../services/fundamentalsHistory';
import HistorySummaryStrip from './HistorySummaryStrip';
import MetricChart from './MetricChart';

interface FinancialHistoryProps {
  symbol: string;
  currency: string;
  priceHistory: HistoricalPricePoint[];
}

type Window = 5 | 10 | 99;

const FinancialHistory: React.FC<FinancialHistoryProps> = ({ symbol, currency, priceHistory }) => {
  const [data, setData] = useState<FundamentalsHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [window, setWindow] = useState<Window>(5);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    fetchFundamentalsHistory(symbol, 'max')
      .then(res => {
        if (!cancelled) setData(res);
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Historical fundamentals are unavailable for this stock.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (loading) {
    return (
      <Paper sx={{ p: 3, my: 1.5, textAlign: 'center' }}>
        <CircularProgress size={24} />
        <Typography variant='body2' color='textSecondary' sx={{ mt: 1 }}>
          Loading financial history…
        </Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Alert severity='info' sx={{ my: 1.5 }}>
        {error}
      </Alert>
    );
  }

  if (!data || data.coverage.availableYears === 0) {
    return null;
  }

  const s = (k: keyof FundamentalsHistoryResponse['series']): YearValue[] =>
    sliceYears(data.series[k], window);

  const revenue = s('revenue');
  const netIncome = s('netIncome');
  const eps = s('eps');
  const grossMargin = s('grossMargin');
  const operatingMargin = s('operatingMargin');
  const netMargin = s('netMargin');
  const roe = s('roe');
  const fcf = s('freeCashFlow');
  const totalDebt = s('totalDebt');
  const dividend = s('dividendPerShare');

  // Historical P/E from price history + EPS (estimate)
  const peFull = computeHistoricalPE(priceHistory, data.series.eps);
  const pe = sliceYears(peFull, window);

  const ann = (series: YearValue[], kind: 'cagr' | 'change') => {
    if (kind === 'cagr') {
      const c = cagr(series);
      return c == null ? null : { text: `CAGR ${c.toFixed(1)}%`, positive: c >= 0 };
    }
    const ch = changeOverWindow(series);
    return ch == null ? null : { text: `${ch >= 0 ? '+' : ''}${ch.toFixed(1)}pp`, positive: ch >= 0 };
  };

  const coverageNote =
    (window !== 99 && data.coverage.availableYears < window)
      ? `Only ${data.coverage.availableYears} years of data available.`
      : `FY${data.coverage.from}–FY${data.coverage.to}`;

  const flowCharts: { title: string; data: YearValue[]; annKind: 'cagr' }[] = [
    { title: 'Revenue', data: revenue, annKind: 'cagr' },
    { title: 'Net Income', data: netIncome, annKind: 'cagr' },
    { title: 'Free Cash Flow', data: fcf, annKind: 'cagr' },
    { title: 'Total Debt', data: totalDebt, annKind: 'cagr' },
    { title: 'Dividend / Share', data: dividend, annKind: 'cagr' },
  ];

  const ratioCharts: { title: string; data: YearValue[]; fmt: 'percent' | 'ratio'; annKind: 'cagr' | 'change' }[] = [
    { title: 'EPS', data: eps, fmt: 'ratio', annKind: 'cagr' },
    { title: 'Gross Margin', data: grossMargin, fmt: 'percent', annKind: 'change' },
    { title: 'Operating Margin', data: operatingMargin, fmt: 'percent', annKind: 'change' },
    { title: 'Net Margin', data: netMargin, fmt: 'percent', annKind: 'change' },
    { title: 'Return on Equity', data: roe, fmt: 'percent', annKind: 'change' },
    { title: 'P/E Ratio (est.)', data: pe, fmt: 'ratio', annKind: 'change' },
  ];

  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, my: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1 }}>
        <Typography variant='h6'>Financial History</Typography>
        <ToggleButtonGroup
          value={window}
          exclusive
          size='small'
          onChange={(_, v) => v && setWindow(v)}
        >
          <ToggleButton value={5}>5Y</ToggleButton>
          <ToggleButton value={10}>10Y</ToggleButton>
          <ToggleButton value={99}>Max</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Typography variant='caption' color='textSecondary' sx={{ display: 'block', mb: 2 }}>
        Annual figures · {coverageNote}
      </Typography>

      <HistorySummaryStrip revenue={revenue} eps={eps} roe={roe} netMargin={netMargin} />

      <Grid container spacing={2}>
        {flowCharts.map(c => {
          if (!c.data || c.data.length === 0) return null;
          const a = ann(c.data, 'cagr');
          return (
            <Grid item xs={12} sm={6} key={c.title}>
              <MetricChart
                title={c.title}
                data={c.data}
                chartType='bar'
                valueFormat='currency'
                currency={currency}
                annotation={a?.text}
                positiveAnnotation={a?.positive}
              />
            </Grid>
          );
        })}
        {ratioCharts.map(c => {
          if (!c.data || c.data.length === 0) return null;
          const a = ann(c.data, c.annKind);
          return (
            <Grid item xs={12} sm={6} key={c.title}>
              <MetricChart
                title={c.title}
                data={c.data}
                chartType='line'
                valueFormat={c.fmt}
                currency={currency}
                annotation={a?.text}
                positiveAnnotation={a?.positive}
              />
            </Grid>
          );
        })}
      </Grid>

      <Typography variant='caption' color='textSecondary' sx={{ display: 'block', mt: 2 }}>
        P/E is estimated from year-end price ÷ reported EPS. Historical depth depends on data availability.
      </Typography>
    </Paper>
  );
};

export default FinancialHistory;
