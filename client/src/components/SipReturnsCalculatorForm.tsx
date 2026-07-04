import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import styled from 'styled-components';
import ShareIcon from '@mui/icons-material/Share';
import html2canvas from 'html2canvas';
import SliderInput from './SliderInput';
import {
  fetchHistoricalData,
  searchSymbols,
  getExchangeRate,
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

const periodOptions = [
  { value: '1', label: '1 Year' },
  { value: '3', label: '3 Years' },
  { value: '5', label: '5 Years' },
  { value: '10', label: '10 Years' },
  { value: '15', label: '15 Years' },
  { value: '20', label: '20 Years' },
  { value: 'custom', label: 'Custom' },
];

const TimePeriodSelector: React.FC<{
  timePeriod: string;
  onChange: (val: string) => void;
}> = ({ timePeriod, onChange }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (isMobile) {
    return (
      <FormControl fullWidth size='small' sx={{ mb: 2 }}>
        <InputLabel>Time Period</InputLabel>
        <Select
          value={timePeriod}
          label='Time Period'
          onChange={e => onChange(e.target.value)}
        >
          {periodOptions.map(opt => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  return (
    <ToggleButtonGroup
      value={timePeriod}
      exclusive
      onChange={(_, val) => val && onChange(val)}
      sx={{ mb: 2, display: 'flex', width: '100%' }}
      size='small'
      color='primary'
    >
      {periodOptions.map(opt => (
        <ToggleButton key={opt.value} value={opt.value} sx={{ flex: 1, px: 0 }}>
          {opt.value === 'custom' ? 'Custom' : `${opt.value}Y`}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
};

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
  dataStartDate?: string;
  dataEndDate?: string;
  partialData?: boolean;
}

const SipReturnsCalculatorForm: React.FC = () => {
  const [symbol, setSymbol] = useState('');
  const [sipAmount, setSipAmount] = useState(10000);
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 5);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SipResult | null>(null);
  const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [timePeriod, setTimePeriod] = useState('5');
  const [inputDisplay, setInputDisplay] = useState('');
  const searchTimeout = React.useRef<NodeJS.Timeout | null>(null);
  const hasCalculated = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // Auto-recalculate immediately when SIP amount or frequency changes
  useEffect(() => {
    if (!hasCalculated.current || !symbol.trim()) return;
    handleCalculate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sipAmount, frequency]);

  // Auto-recalculate when dates change via period selector (not manual typing)
  const periodTriggered = useRef(false);
  useEffect(() => {
    if (!periodTriggered.current) return;
    periodTriggered.current = false;
    if (hasCalculated.current && symbol.trim()) {
      handleCalculate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  // Recalculate on date blur (not on every keystroke)
  const handleDateBlur = () => {
    if (hasCalculated.current && symbol.trim()) {
      handleCalculate();
    }
  };

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

  // Forex-aware SIP calculation: converts INR SIP to foreign currency using historical rates
  const calculateSipReturnsWithForex = (
    prices: HistoricalPrice[],
    inrAmount: number,
    freq: Frequency,
    isNonInr: boolean,
    forexPrices: HistoricalPrice[],
  ): Omit<SipResult, 'currency' | 'symbol'> => {
    const sipDates = getSipDates(new Date(startDate), new Date(endDate), freq);

    let totalUnits = 0;
    let totalInvestedInr = 0;
    let installments = 0;
    const cashFlows: { date: Date; amount: number }[] = [];

    for (const sipDate of sipDates) {
      const price = findClosestPrice(prices, sipDate);
      if (!price) continue;

      let sipInForeignCurrency = inrAmount;

      if (isNonInr) {
        // Find the forex rate on this SIP date (e.g. 1 USD = 83 INR)
        const forexRate = findClosestPrice(forexPrices, sipDate);
        const rateOnDate = forexRate?.close || 83; // fallback
        sipInForeignCurrency = inrAmount / rateOnDate; // Convert INR to USD
      }

      const units = sipInForeignCurrency / price.close;
      totalUnits += units;
      totalInvestedInr += inrAmount;
      installments++;
      cashFlows.push({ date: price.date, amount: -inrAmount });
    }

    // Current value: units × last stock price × current forex rate
    const lastPrice = prices[prices.length - 1]?.close || 0;
    const lastDate = prices[prices.length - 1]?.date || new Date(endDate);

    let currentValueInr: number;
    if (isNonInr) {
      const lastForex = forexPrices.length > 0
        ? forexPrices[forexPrices.length - 1].close
        : 83;
      currentValueInr = totalUnits * lastPrice * lastForex;
    } else {
      currentValueInr = totalUnits * lastPrice;
    }

    const absoluteReturns = currentValueInr - totalInvestedInr;
    const absoluteReturnsPercent =
      totalInvestedInr > 0 ? (absoluteReturns / totalInvestedInr) * 100 : 0;

    // XIRR in INR terms
    cashFlows.push({ date: lastDate, amount: currentValueInr });
    const xirr = calculateXIRR(cashFlows) * 100;

    return {
      totalInvested: totalInvestedInr,
      currentValue: currentValueInr,
      totalUnits,
      absoluteReturns,
      absoluteReturnsPercent,
      xirr,
      sipInstallments: installments,
    };
  };

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    hasCalculated.current = true;
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

      // Detect if data is only partially available
      const actualStartDate = response.prices[0].date;
      const actualEndDate = response.prices[response.prices.length - 1].date;
      const requestedStart = new Date(startDate);
      const partialData =
        actualStartDate.getTime() - requestedStart.getTime() > 7 * 24 * 60 * 60 * 1000;

      const isNonInr = response.meta.currency !== 'INR';

      // Fetch historical USD/INR rates if non-INR stock
      let forexPrices: HistoricalPrice[] = [];
      if (isNonInr) {
        try {
          const forexResponse = await fetchHistoricalData(
            `${response.meta.currency}INR=X`,
            new Date(startDate),
            new Date(endDate),
          );
          forexPrices = forexResponse.prices;
        } catch {
          // If forex data fails, fallback to approximate rate
        }
      }

      const sipResult = calculateSipReturnsWithForex(
        response.prices,
        sipAmount,
        frequency,
        isNonInr,
        forexPrices,
      );

      setResult({
        ...sipResult,
        currency: 'INR',
        symbol: response.meta.symbol,
        dataStartDate: actualStartDate.toISOString().split('T')[0],
        dataEndDate: actualEndDate.toISOString().split('T')[0],
        partialData,
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

  function formatWithCompact(num: number): string {
    const absNum = Math.abs(num);
    if (absNum >= 1e7) {
      return `₹${(num / 1e7).toFixed(2)} Cr`;
    } else if (absNum >= 1e5) {
      return `₹${(num / 1e5).toFixed(2)} Lac`;
    }
    return formatIndianCurrency(num);
  }

  function formatCurrency(num: number, _currency: string): string {
    return formatWithCompact(num);
  }

  function formatSymbolDisplay(symbol: string): string {
    const indexLabels: Record<string, string> = {
      '^NSEI': 'Nifty 50 (NSE)',
      '^BSESN': 'Sensex (BSE)',
      '^GSPC': 'S&P 500',
      '^NDX': 'NASDAQ 100',
      '^DJI': 'Dow Jones Industrial Average',
    };

    if (indexLabels[symbol]) return indexLabels[symbol];
    if (symbol.startsWith('^')) {
      return symbol.replace('^', '') + ' (Index)';
    }
    if (symbol.endsWith('-USD')) {
      return symbol.replace('-USD', '') + ' (Crypto)';
    }
    if (symbol.endsWith('-INR')) {
      return symbol.replace('-INR', '') + ' (Crypto/INR)';
    }
    if (symbol.endsWith('.NS')) {
      return `${symbol.replace('.NS', '')} (NSE)`;
    }
    if (symbol.endsWith('.BO')) {
      return `${symbol.replace('.BO', '')} (BSE)`;
    }
    return symbol;
  }

  function handleShare(res: SipResult) {
    if (!resultRef.current) return;

    html2canvas(resultRef.current, {
      backgroundColor: '#ffffff',
      scale: 2,
    }).then(async canvas => {
      canvas.toBlob(async blob => {
        if (!blob) return;

        const file = new File([blob], 'sip-returns.png', { type: 'image/png' });
        const shareText = getShareText(res);

        // Try native share API (works on mobile with image + text)
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({
              title: `SIP Returns — ${formatSymbolDisplay(res.symbol)}`,
              text: shareText,
              files: [file],
            });
            return;
          } catch {
            // User cancelled or share failed, fallback below
          }
        }

        // Fallback: open WhatsApp with text + link
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, '_blank');
      }, 'image/png');
    });
  }

  function getShareText(res: SipResult): string {
    const symbolName = formatSymbolDisplay(res.symbol);
    const period = res.partialData
      ? `${new Date(res.dataStartDate!).toLocaleDateString()} to ${new Date(res.dataEndDate!).toLocaleDateString()}`
      : `${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`;

    return [
      `📊 *SIP Returns — ${symbolName}*`,
      ``,
      `💰 SIP: ${formatWithCompact(sipAmount)} / ${frequency}`,
      `📅 Period: ${period}`,
      ``,
      `📥 Invested: ${formatWithCompact(res.totalInvested)}`,
      `📈 Value: ${formatWithCompact(res.currentValue)}`,
      `${res.absoluteReturns >= 0 ? '✅' : '🔻'} Returns: ${formatWithCompact(res.absoluteReturns)} (${res.absoluteReturnsPercent.toFixed(2)}%)`,
      `📊 XIRR: ${res.xirr.toFixed(2)}%`,
      ``,
      `Try it yourself 👉 https://calc.cash-flow.in/#/sip-returns`,
    ].join('\n');
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
              : `${formatSymbolDisplay(option.symbol)} — ${option.name}`
          }
          loading={searchLoading}
          inputValue={inputDisplay}
          onChange={(_, val) => {
            if (val === null) {
              setSymbol('');
              setInputDisplay('');
            } else if (typeof val === 'string') {
              setSymbol(val);
              setInputDisplay(val);
            } else {
              setSymbol(val.symbol);
              setInputDisplay(`${formatSymbolDisplay(val.symbol)} — ${val.name}`);
            }
          }}
          onInputChange={(_, val, reason) => {
            if (reason === 'clear') {
              setInputDisplay('');
              setSymbol('');
              setSearchResults([]);
              return;
            }
            if (reason === 'input') {
              setInputDisplay(val);
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
              label='Search Stock / ETF / Index'
              variant='outlined'
              size='small'
              placeholder='Type company name or symbol...'
              helperText='e.g. Infosys, TCS, Apple, Nifty, NASDAQ 100, S&P 500'
              sx={{ mb: 2 }}
            />
          )}
          renderOption={(props, option) => (
            <li {...props} key={typeof option === 'string' ? option : option.symbol}>
              <Box>
                <Typography variant='body2' fontWeight={600}>
                  {typeof option === 'string' ? option : formatSymbolDisplay(option.symbol)}
                </Typography>
                {typeof option !== 'string' && (
                  <Typography variant='caption' color='textSecondary'>
                    {option.name} · {option.type}
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
          <ToggleButton value='monthly' sx={{ px: { xs: 2, sm: 3 } }}>
            Monthly
          </ToggleButton>
          <ToggleButton value='weekly' sx={{ px: { xs: 2, sm: 3 } }}>
            Weekly
          </ToggleButton>
          <ToggleButton value='daily' sx={{ px: { xs: 2, sm: 3 } }}>
            Daily
          </ToggleButton>
        </ToggleButtonGroup>

        <Typography variant='body2' fontWeight={500} sx={{ mb: 1.5, mt: 1 }}>
          Time Period
        </Typography>
        <TimePeriodSelector
          timePeriod={timePeriod}
          onChange={(val) => {
            setTimePeriod(val);
            if (val === 'custom') return;
            const today = new Date();
            setEndDate(today.toISOString().split('T')[0]);
            const start = new Date(today);
            start.setFullYear(start.getFullYear() - parseInt(val, 10));
            setStartDate(start.toISOString().split('T')[0]);
            periodTriggered.current = true;
          }}
        />

        {timePeriod === 'custom' && (
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              label='Start Date'
              type='date'
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              onBlur={handleDateBlur}
              InputLabelProps={{ shrink: true }}
              size='small'
              fullWidth
            />
            <TextField
              label='End Date'
              type='date'
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              onBlur={handleDateBlur}
              InputLabelProps={{ shrink: true }}
              size='small'
              fullWidth
            />
          </Box>
        )}

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
        <StyledResultContainer ref={resultRef}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant='h6'>
              SIP Returns — {formatSymbolDisplay(result.symbol)}
            </Typography>
            <Button
              size='small'
              startIcon={<ShareIcon />}
              onClick={() => handleShare(result)}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Share
            </Button>
          </Box>

          {result.partialData && (
            <Alert severity='info' sx={{ mb: 2 }}>
              Data available only from <strong>{new Date(result.dataStartDate!).toLocaleDateString()}</strong> to <strong>{new Date(result.dataEndDate!).toLocaleDateString()}</strong>.
              Returns are calculated for this period only.
            </Alert>
          )}

          <Divider sx={{ mb: 2 }} />

          <ResultRow>
            <ResultLabel variant='body1'>SIP Amount</ResultLabel>
            <ResultValue variant='body1'>
              {formatWithCompact(sipAmount)} / {frequency}
            </ResultValue>
          </ResultRow>

          <Divider />

          <ResultRow>
            <ResultLabel variant='body1'>Period</ResultLabel>
            <ResultValue variant='body1'>
              {result.partialData
                ? `${new Date(result.dataStartDate!).toLocaleDateString()} — ${new Date(result.dataEndDate!).toLocaleDateString()}`
                : `${new Date(startDate).toLocaleDateString()} — ${new Date(endDate).toLocaleDateString()}`}
            </ResultValue>
          </ResultRow>

          <Divider />

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

// XIRR calculation using Newton-Raphson method with bisection fallback
function calculateXIRR(cashFlows: { date: Date; amount: number }[]): number {
  if (cashFlows.length < 2) return 0;

  const daysInYear = 365.25;
  const firstDate = cashFlows[0].date;

  const flows = cashFlows.map(cf => ({
    amount: cf.amount,
    years: (cf.date.getTime() - firstDate.getTime()) / (daysInYear * 24 * 60 * 60 * 1000),
  }));

  // NPV function
  const npvAtRate = (r: number): number => {
    let npv = 0;
    for (const flow of flows) {
      npv += flow.amount / Math.pow(1 + r, flow.years);
    }
    return npv;
  };

  // Determine if overall returns are positive or negative
  const totalInvested = cashFlows
    .filter(cf => cf.amount < 0)
    .reduce((sum, cf) => sum + Math.abs(cf.amount), 0);
  const finalValue = cashFlows[cashFlows.length - 1].amount;
  const isNegativeReturn = finalValue < totalInvested;

  // Better initial guess based on returns direction
  let rate = isNegativeReturn ? -0.1 : 0.1;

  // Newton-Raphson
  for (let iter = 0; iter < 100; iter++) {
    let npv = 0;
    let dnpv = 0;

    for (const flow of flows) {
      const factor = Math.pow(1 + rate, flow.years);
      if (factor === 0 || !isFinite(factor)) break;
      npv += flow.amount / factor;
      dnpv -= (flow.years * flow.amount) / (factor * (1 + rate));
    }

    if (Math.abs(npv) < 1e-6) break;
    if (dnpv === 0 || !isFinite(dnpv)) break;

    const newRate = rate - npv / dnpv;

    if (isNaN(newRate) || !isFinite(newRate)) break;

    // Clamp to reasonable bounds (-0.99 to 2.0 i.e. -99% to 200%)
    rate = Math.max(-0.99, Math.min(2.0, newRate));
  }

  // Sanity check: if rate hit bounds, try bisection method
  if (rate >= 1.99 || rate <= -0.98) {
    let low = -0.99;
    let high = 2.0;
    const npvLow = npvAtRate(low);
    const npvHigh = npvAtRate(high);

    // Only bisect if NPV changes sign in range
    if (npvLow * npvHigh < 0) {
      for (let i = 0; i < 100; i++) {
        const mid = (low + high) / 2;
        const npvMid = npvAtRate(mid);
        if (Math.abs(npvMid) < 1e-6) {
          rate = mid;
          break;
        }
        if (npvMid * npvLow < 0) {
          high = mid;
        } else {
          low = mid;
        }
        rate = mid;
      }
    } else {
      // Can't find a root — return a simple CAGR approximation
      const years = flows[flows.length - 1].years;
      if (years > 0 && totalInvested > 0) {
        rate = Math.pow(finalValue / totalInvested, 1 / years) - 1;
        rate = Math.max(-0.99, Math.min(2.0, rate));
      } else {
        rate = 0;
      }
    }
  }

  return rate;
}

export default SipReturnsCalculatorForm;
