import React, { useState, useCallback } from 'react';
import {
  Paper,
  Typography,
  Divider,
  Box,
  TextField,
  Button,
  Autocomplete,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
} from '@mui/material';
import styled from 'styled-components';
import SliderInput from './SliderInput';
import {
  fetchHistoricalData,
  searchSymbols,
  HistoricalPrice,
  SymbolSearchResult,
} from '../services/yahooFinance';

const StyledFormContainer = styled(Paper)`
  padding: 2rem;
  margin: 1.5rem 0;
`;

const StyledResultContainer = styled(Paper)`
  padding: 2rem;
  margin: 1.5rem 0;
`;

const ResultRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
`;

const ResultLabel = styled(Typography)`
  color: #546e7a;
`;

const ResultValue = styled(Typography)`
  font-weight: 700;
  color: #1a2a3a;
`;

const HighlightValue = styled(Typography)`
  font-weight: 700;
  color: #2e7d5b;
  font-size: 1.25rem;
`;

const NegativeValue = styled(Typography)`
  font-weight: 700;
  color: #c0392b;
  font-size: 1.25rem;
`;

type Frequency = 'monthly' | 'weekly' | 'daily';

interface SipResult {
  totalInvested: number;
  currentValue: number;
  totalUnits: number;
  absoluteReturns: number;
  absoluteReturnsPercent: number;
  xirr: number;
  sipInstallments: number;
  currency: string;
  symbol: string;
}

const SipReturnsCalculatorForm: React.FC = () => {
  const [symbol, setSymbol] = useState('');
  const [sipAmount, setSipAmount] = useState(10000);
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [startDate, setStartDate] = useState('2020-01-01');
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SipResult | null>(null);
  const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeout = React.useRef<NodeJS.Timeout | null>(null);

  const calculateSipReturns = useCallback(
    (prices: HistoricalPrice[], amount: number, freq: Frequency): Omit<SipResult, 'currency' | 'symbol'> => {
      // Get SIP dates based on frequency
      const sipDates = getSipDates(
        new Date(startDate),
        new Date(endDate),
        freq,
      );

      let totalUnits = 0;
      let totalInvested = 0;
      let installments = 0;
      const cashFlows: { date: Date; amount: number }[] = [];

      for (const sipDate of sipDates) {
        // Find the closest price on or after the SIP date
        const price = findClosestPrice(prices, sipDate);
        if (price) {
          const units = amount / price.close;
          totalUnits += units;
          totalInvested += amount;
          installments++;
          cashFlows.push({ date: price.date, amount: -amount });
        }
      }

      // Current value based on last available price
      const lastPrice = prices[prices.length - 1]?.close || 0;
      const lastDate = prices[prices.length - 1]?.date || new Date(endDate);
      const currentValue = totalUnits * lastPrice;
      const absoluteReturns = currentValue - totalInvested;
      const absoluteReturnsPercent =
        totalInvested > 0 ? (absoluteReturns / totalInvested) * 100 : 0;

      // Add final value as positive cash flow
      cashFlows.push({ date: lastDate, amount: currentValue });

      // Calculate XIRR
      const xirr = calculateXIRR(cashFlows) * 100;

      return {
        totalInvested,
        currentValue,
        totalUnits,
        absoluteReturns,
        absoluteReturnsPercent,
        xirr,
        sipInstallments: installments,
      };
    },
    [startDate, endDate],
  );

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetchHistoricalData(
        symbol,
        new Date(startDate),
        new Date(endDate),
      );

      if (response.prices.length === 0) {
        throw new Error('No price data found for the given date range.');
      }

      const sipResult = calculateSipReturns(
        response.prices,
        sipAmount,
        frequency,
      );

      setResult({
        ...sipResult,
        currency: response.meta.currency,
        symbol: response.meta.symbol,
      });
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  function formatIndianCurrency(num: number): string {
    const absNum = Math.abs(Math.round(num));
    const numStr = absNum.toString();
    if (numStr.length <= 3) return `₹${numStr}`;

    let result = numStr.slice(-3);
    let remaining = numStr.slice(0, -3);
    while (remaining.length > 2) {
      result = remaining.slice(-2) + ',' + result;
      remaining = remaining.slice(0, -2);
    }
    if (remaining.length > 0) {
      result = remaining + ',' + result;
    }
    return num < 0 ? `-₹${result}` : `₹${result}`;
  }

  function formatCompact(num: number): string {
    const absNum = Math.abs(num);
    if (absNum >= 1e7) {
      return `${(num / 1e7).toFixed(2)} Cr`;
    } else if (absNum >= 1e5) {
      return `${(num / 1e5).toFixed(2)} Lac`;
    }
    return Math.round(num).toLocaleString('en-IN');
  }

  function formatWithCompact(num: number): string {
    const absNum = Math.abs(num);
    if (absNum >= 1e7) {
      return `₹${(num / 1e7).toFixed(2)} Cr`;
    } else if (absNum >= 1e5) {
      return `₹${(num / 1e5).toFixed(2)} Lac`;
    }
    return formatIndianCurrency(num);
  }

  function formatCurrency(num: number, currency: string): string {
    if (currency === 'INR') {
      return formatWithCompact(num);
    }
    return `$${Math.round(num).toLocaleString('en-US')}`;
  }

  return (
    <>
      <StyledFormContainer>
        <Typography variant='subtitle1' fontWeight={600} sx={{ mb: 2 }}>
          Backtest SIP returns on real stock/ETF data
        </Typography>

        <Autocomplete
          freeSolo
          options={searchResults}
          getOptionLabel={option =>
            typeof option === 'string'
              ? option
              : `${option.symbol} — ${option.name} (${option.exchange})`
          }
          loading={searchLoading}
          value={symbol}
          onChange={(_, val) => {
            if (typeof val === 'string') {
              setSymbol(val);
            } else if (val) {
              setSymbol(val.symbol);
            }
          }}
          onInputChange={(_, val, reason) => {
            if (reason === 'input') {
              setSymbol(val);
              // Debounced search
              if (searchTimeout.current) clearTimeout(searchTimeout.current);
              if (val.length >= 2) {
                setSearchLoading(true);
                searchTimeout.current = setTimeout(async () => {
                  const results = await searchSymbols(val);
                  setSearchResults(results);
                  setSearchLoading(false);
                }, 300);
              } else {
                setSearchResults([]);
                setSearchLoading(false);
              }
            }
          }}
          filterOptions={x => x}
          renderInput={params => (
            <TextField
              {...params}
              label='Search Stock / ETF'
              variant='outlined'
              size='small'
              placeholder='Type company name or symbol...'
              helperText='e.g. Infosys, TCS, Apple, Nifty'
              sx={{ mb: 2 }}
            />
          )}
          renderOption={(props, option) => (
            <li {...props} key={typeof option === 'string' ? option : option.symbol}>
              <Box>
                <Typography variant='body2' fontWeight={600}>
                  {typeof option === 'string' ? option : option.symbol}
                </Typography>
                {typeof option !== 'string' && (
                  <Typography variant='caption' color='textSecondary'>
                    {option.name} · {option.exchange} · {option.type}
                  </Typography>
                )}
              </Box>
            </li>
          )}
        />

        <SliderInput
          label='SIP Amount'
          value={sipAmount}
          onChange={setSipAmount}
          min={500}
          max={500000}
          step={500}
          prefix='₹'
          formatDisplay={v =>
            v >= 1e5
              ? `${(v / 1e5).toFixed(2)} Lac`
              : v.toLocaleString('en-IN')
          }
        />

        <Typography variant='body2' fontWeight={500} sx={{ mb: 1 }}>
          SIP Frequency
        </Typography>
        <ToggleButtonGroup
          value={frequency}
          exclusive
          onChange={(_, val) => val && setFrequency(val)}
          sx={{ mb: 3 }}
          size='small'
        >
          <ToggleButton value='monthly' sx={{ px: 3 }}>
            Monthly
          </ToggleButton>
          <ToggleButton value='weekly' sx={{ px: 3 }}>
            Weekly
          </ToggleButton>
          <ToggleButton value='daily' sx={{ px: 3 }}>
            Daily
          </ToggleButton>
        </ToggleButtonGroup>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            label='Start Date'
            type='date'
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size='small'
            fullWidth
          />
          <TextField
            label='End Date'
            type='date'
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size='small'
            fullWidth
          />
        </Box>

        <Button
          variant='contained'
          color='primary'
          onClick={handleCalculate}
          disabled={loading || !symbol.trim()}
          fullWidth
          size='large'
        >
          {loading ? (
            <CircularProgress size={24} color='inherit' />
          ) : (
            'Calculate SIP Returns'
          )}
        </Button>
      </StyledFormContainer>

      {error && (
        <Alert severity='error' sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}

      {result && (
        <StyledResultContainer>
          <Typography variant='h6' gutterBottom>
            SIP Returns — {result.symbol}
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <ResultRow>
            <ResultLabel variant='body1'>Total Invested</ResultLabel>
            <ResultValue variant='body1'>
              {formatCurrency(result.totalInvested, result.currency)}
            </ResultValue>
          </ResultRow>

          <Divider />

          <ResultRow>
            <ResultLabel variant='body1'>Current Value</ResultLabel>
            <HighlightValue>
              {formatCurrency(result.currentValue, result.currency)}
            </HighlightValue>
          </ResultRow>

          <Divider />

          <ResultRow>
            <ResultLabel variant='body1'>Total Returns</ResultLabel>
            {result.absoluteReturns >= 0 ? (
              <HighlightValue>
                {formatCurrency(result.absoluteReturns, result.currency)} (
                {result.absoluteReturnsPercent.toFixed(2)}%)
              </HighlightValue>
            ) : (
              <NegativeValue>
                {formatCurrency(result.absoluteReturns, result.currency)} (
                {result.absoluteReturnsPercent.toFixed(2)}%)
              </NegativeValue>
            )}
          </ResultRow>

          <Divider />

          <ResultRow>
            <ResultLabel variant='body1'>Annualized Returns (XIRR)</ResultLabel>
            {result.xirr >= 0 ? (
              <HighlightValue>{result.xirr.toFixed(2)}%</HighlightValue>
            ) : (
              <NegativeValue>{result.xirr.toFixed(2)}%</NegativeValue>
            )}
          </ResultRow>

          <Divider />

          <ResultRow>
            <ResultLabel variant='body1'>SIP Installments</ResultLabel>
            <ResultValue variant='body1'>{result.sipInstallments}</ResultValue>
          </ResultRow>

          <Divider />

          <ResultRow>
            <ResultLabel variant='body1'>Total Units Accumulated</ResultLabel>
            <ResultValue variant='body1'>
              {result.totalUnits.toFixed(4)}
            </ResultValue>
          </ResultRow>
        </StyledResultContainer>
      )}
    </>
  );
};

// Helper: Get SIP investment dates
function getSipDates(start: Date, end: Date, freq: Frequency): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));

    if (freq === 'monthly') {
      current.setMonth(current.getMonth() + 1);
    } else if (freq === 'weekly') {
      current.setDate(current.getDate() + 7);
    } else {
      // daily — every trading day, but we'll push every day and match to closest
      current.setDate(current.getDate() + 1);
    }
  }

  return dates;
}

// Helper: Find closest price on or after a given date
function findClosestPrice(
  prices: HistoricalPrice[],
  targetDate: Date,
): HistoricalPrice | null {
  // Binary search for the closest date
  let low = 0;
  let high = prices.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (prices[mid].date >= targetDate) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  // low now points to the first price on or after targetDate
  if (low < prices.length) {
    // Allow up to 5 days gap (weekends/holidays)
    const diffDays =
      (prices[low].date.getTime() - targetDate.getTime()) /
      (1000 * 60 * 60 * 24);
    if (diffDays <= 5) {
      return prices[low];
    }
  }

  return null;
}

// XIRR calculation using Newton-Raphson method
function calculateXIRR(cashFlows: { date: Date; amount: number }[]): number {
  if (cashFlows.length < 2) return 0;

  const daysInYear = 365.25;
  const firstDate = cashFlows[0].date;

  // Convert dates to year fractions from first date
  const flows = cashFlows.map(cf => ({
    amount: cf.amount,
    years: (cf.date.getTime() - firstDate.getTime()) / (daysInYear * 24 * 60 * 60 * 1000),
  }));

  // Newton-Raphson to solve for rate where NPV = 0
  let rate = 0.1; // Initial guess: 10%

  for (let iter = 0; iter < 100; iter++) {
    let npv = 0;
    let dnpv = 0;

    for (const flow of flows) {
      const factor = Math.pow(1 + rate, flow.years);
      npv += flow.amount / factor;
      dnpv -= (flow.years * flow.amount) / (factor * (1 + rate));
    }

    if (Math.abs(npv) < 1e-6) break;

    const newRate = rate - npv / dnpv;

    // Guard against divergence
    if (isNaN(newRate) || !isFinite(newRate)) {
      return rate;
    }

    // Clamp to reasonable bounds (-0.99 to 10 i.e. -99% to 1000%)
    rate = Math.max(-0.99, Math.min(10, newRate));
  }

  return rate;
}

export default SipReturnsCalculatorForm;
