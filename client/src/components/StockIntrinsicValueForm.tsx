import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Paper,
  Typography,
  Divider,
  Box,
  TextField,
  Button,
  Autocomplete,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import styled from 'styled-components';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import SliderInput from './SliderInput';
import ValuationGauge from './ValuationGauge';
import QualityScoreCard from './QualityScoreCard';
import FinancialHistory from './history/FinancialHistory';
import {
  fetchStockFundamentals,
  fetchHistoricalData,
  searchSymbols,
  SymbolSearchResult,
} from '../services/yahooFinance';
import {
  calculateValuation,
  calculateScenarios,
  ScenarioKey,
  ScenarioSet,
  WaccBreakdown,
  ValuationAssumptions,
  ConfidenceAssessment,
  QualityScore,
} from '../services/valuation';

const StyledFormContainer = styled(Paper)`
  padding: 2rem;
  margin: 1.5rem 0;
`;

const StyledResultContainer = styled(Paper)`
  padding: 2rem;
  margin: 1.5rem 0;
`;

interface AnalysisResult {
  symbol: string;
  currentPrice: number;
  currency: string;
  // Valuation (all per-share)
  dcfValue: number;
  relativeValue: number;
  intrinsicValue: number;
  upsidePct: number;
  marginOfSafetyPct: number;
  accumulationLevel: number;
  exitLevel: number;
  verdict: 'BUY' | 'ACCUMULATE' | 'HOLD' | 'AVOID' | 'EXIT';
  dcfReliable: boolean;
  relativeReliable: boolean;
  dcfMethod: 'FCF' | 'Earnings' | 'none';
  effectiveDiscountRate: number;
  confidence: ConfidenceAssessment;
  quality: QualityScore;
  relativeBreakdown: { method: string; fairValue: number }[];
  wacc: WaccBreakdown | null;
  assumptions: ValuationAssumptions;
  // Fundamentals for display
  eps: number;
  peRatio: number;
  pbRatio: number;
  debtToEquity: number;
  roe: number;
  revenueGrowth: number;
  earningsGrowth: number;
  dividendYield: number;
  bookValue: number;
  marketCap: number;
  freeCashFlow: number;
  operatingMargin: number;
  profitMargin: number;
  pegRatio: number;
  sector: string;
  industry: string;
  description: string;
}

interface ChartDataPoint {
  date: string;
  marketPrice: number;
  intrinsicValue: number;
  accumulationLevel: number;
  exitLevel: number;
}

function formatSymbolDisplay(symbol: string): string {
  if (symbol.endsWith('.NS')) return `${symbol.replace('.NS', '')} (NSE)`;
  if (symbol.endsWith('.BO')) return `${symbol.replace('.BO', '')} (BSE)`;
  if (symbol.startsWith('^')) return symbol.replace('^', '') + ' (Index)';
  return symbol;
}

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
  if (absNum >= 1e7) return `₹${(num / 1e7).toFixed(2)} Cr`;
  if (absNum >= 1e5) return `₹${(num / 1e5).toFixed(2)} Lac`;
  return formatIndianCurrency(num);
}

function money(num: number, currency: string): string {
  if (currency === 'INR') return formatIndianCurrency(num);
  return `$${num.toFixed(2)}`;
}

function getVerdictColor(verdict: string): string {
  switch (verdict) {
    case 'BUY': return '#1b5e20';
    case 'ACCUMULATE': return '#2e7d32';
    case 'HOLD': return '#f57c00';
    case 'AVOID': return '#e65100';
    case 'EXIT': return '#b71c1c';
    default: return '#546e7a';
  }
}

function getVerdictDescription(verdict: string, upsidePct: number): string {
  const up = Math.abs(upsidePct * 100).toFixed(0);
  switch (verdict) {
    case 'BUY':
      return `Trading well below intrinsic value (about ${up}% undervalued). Strong opportunity with a healthy margin of safety.`;
    case 'ACCUMULATE':
      return `Trading below intrinsic value (about ${up}% undervalued). A reasonable level to gradually build a position.`;
    case 'HOLD':
      return 'Trading close to intrinsic value. Fairly priced — hold existing positions.';
    case 'AVOID':
      return `Trading above intrinsic value (about ${up}% overvalued). Avoid fresh investments at current levels.`;
    case 'EXIT':
      return `Significantly overvalued (about ${up}% above intrinsic value). Consider booking profits.`;
    default: return '';
  }
}

const StockIntrinsicValueForm: React.FC = () => {
  const [symbol, setSymbol] = useState('');
  const [inputDisplay, setInputDisplay] = useState('');

  // Override sliders (as percentages for the UI). Null-ish 0 means "use auto".
  const [growthRate, setGrowthRate] = useState(15);
  const [discountRate, setDiscountRate] = useState(12);
  const [terminalGrowthRate, setTerminalGrowthRate] = useState(4);
  const [marginOfSafetyPct, setMarginOfSafetyPct] = useState(25);
  const [useOverrides, setUseOverrides] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [fundamentalsCache, setFundamentalsCache] = useState<any>(null);
  const [scenarios, setScenarios] = useState<ScenarioSet | null>(null);
  const [scenario, setScenario] = useState<ScenarioKey>('base');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [priceHistory, setPriceHistory] = useState<{ date: Date; close: number }[]>([]);
  const [analyzedSymbol, setAnalyzedSymbol] = useState('');
  const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeout = React.useRef<NodeJS.Timeout | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();

  // Map a computed ValuationResult (+ raw fundamentals) into the display shape.
  const buildResult = (fundamentals: any, valuation: ReturnType<typeof calculateValuation>, symbolOverride?: string): AnalysisResult => {
    const financialData = fundamentals.financialData || {};
    const keyStats = fundamentals.defaultKeyStatistics || {};
    const summaryDetail = fundamentals.summaryDetail || {};
    const profile = fundamentals.summaryProfile || {};
    const currency = financialData.financialCurrency || summaryDetail.currency || 'INR';

    const intrinsic = valuation.intrinsicValuePerShare;
    const price = valuation.currentPrice;
    const marginOfSafety = intrinsic > 0 ? ((intrinsic - price) / intrinsic) * 100 : 0;

    return {
      symbol: formatSymbolDisplay(symbolOverride ?? symbol),
      currentPrice: price,
      currency,
      dcfValue: valuation.dcfValuePerShare,
      relativeValue: valuation.relativeValuePerShare,
      intrinsicValue: intrinsic,
      upsidePct: valuation.upsidePct,
      marginOfSafetyPct: marginOfSafety,
      accumulationLevel: valuation.accumulationLevel,
      exitLevel: valuation.exitLevel,
      verdict: valuation.verdict,
      dcfReliable: valuation.dcfReliable,
      relativeReliable: valuation.relativeReliable,
      dcfMethod: valuation.dcfMethod,
      effectiveDiscountRate: valuation.effectiveDiscountRate,
      confidence: valuation.confidence,
      quality: valuation.quality,
      relativeBreakdown: valuation.relativeBreakdown,
      wacc: valuation.wacc,
      assumptions: valuation.assumptions,
      eps: (keyStats.trailingEps?.raw ?? 0),
      peRatio: summaryDetail.trailingPE?.raw ?? 0,
      pbRatio: keyStats.priceToBook?.raw ?? 0,
      debtToEquity: financialData.debtToEquity?.raw ?? 0,
      roe: financialData.returnOnEquity?.raw ? financialData.returnOnEquity.raw * 100 : 0,
      revenueGrowth: financialData.revenueGrowth?.raw ? financialData.revenueGrowth.raw * 100 : 0,
      earningsGrowth: financialData.earningsGrowth?.raw ? financialData.earningsGrowth.raw * 100 : 0,
      dividendYield: summaryDetail.dividendYield?.raw ? summaryDetail.dividendYield.raw * 100 : 0,
      bookValue: keyStats.bookValue?.raw ?? 0,
      marketCap: summaryDetail.marketCap?.raw ?? 0,
      freeCashFlow: valuation.baseFcf,
      operatingMargin: financialData.operatingMargins?.raw ? financialData.operatingMargins.raw * 100 : 0,
      profitMargin: financialData.profitMargins?.raw ? financialData.profitMargins.raw * 100 : 0,
      pegRatio: keyStats.pegRatio?.raw ?? 0,
      sector: profile.sector || 'N/A',
      industry: profile.industry || 'N/A',
      description: profile.longBusinessSummary || '',
    };
  };

  // Build the historical chart: market price vs intrinsic value back-projected.
  const buildChart = (
    fundamentals: any,
    histPrices: { date: Date; close: number }[],
    res: AnalysisResult,
  ) => {
    if (histPrices.length === 0 || res.intrinsicValue <= 0) {
      setChartData([]);
      return;
    }

    // Sample monthly
    const monthly: { date: Date; close: number }[] = [];
    let lastMonth = -1;
    for (const p of histPrices) {
      const m = p.date.getMonth() + p.date.getFullYear() * 12;
      if (m !== lastMonth) {
        monthly.push(p);
        lastMonth = m;
      }
    }

    // Back-project intrinsic value using the growth rate the model used.
    // Intrinsic value broadly scales with fundamentals (FCF/earnings), which
    // grew over time. We fade today's intrinsic value backward by the growth rate.
    const growth = res.assumptions.initialGrowthRate;
    const now = new Date();

    const points: ChartDataPoint[] = monthly.map(p => {
      const yearsAgo = (now.getTime() - p.date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      const scale = 1 / Math.pow(1 + growth, yearsAgo);
      const iv = res.intrinsicValue * scale;
      return {
        date: p.date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        marketPrice: Math.round(p.close),
        intrinsicValue: Math.round(iv),
        accumulationLevel: Math.round(iv * (1 - res.assumptions.marginOfSafety)),
        exitLevel: Math.round(iv * 1.3),
      };
    });

    setChartData(points);
  };

  const handleAnalyze = async (overrideSymbol?: string) => {
    const sym = (overrideSymbol ?? symbol).trim();
    if (!sym) return;
    if (overrideSymbol) {
      setSymbol(sym);
      setInputDisplay(sym);
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setScenarios(null);
    setChartData([]);
    setPriceHistory([]);
    setUseOverrides(false);
    setScenario('base');

    try {
      const fundamentals = await fetchStockFundamentals(sym);
      setFundamentalsCache(fundamentals);
      setAnalyzedSymbol(sym);

      const financialData = fundamentals.financialData || {};
      const summaryDetail = fundamentals.summaryDetail || {};
      const currency = financialData.financialCurrency || summaryDetail.currency || 'INR';

      const scen = calculateScenarios(fundamentals, currency, {});
      setScenarios(scen);

      const res = buildResult(fundamentals, scen.base, sym);

      // Sync the override sliders to the auto-computed base values
      setGrowthRate(Math.round(scen.base.assumptions.initialGrowthRate * 1000) / 10);
      setDiscountRate(Math.round(scen.base.effectiveDiscountRate * 1000) / 10);
      setTerminalGrowthRate(Math.round(scen.base.assumptions.terminalGrowthRate * 1000) / 10);
      setMarginOfSafetyPct(Math.round(scen.base.assumptions.marginOfSafety * 100));

      setResult(res);

      // Chart (optional)
      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 5);
        const histData = await fetchHistoricalData(sym, startDate, endDate);
        setPriceHistory(histData.prices);
        buildChart(fundamentals, histData.prices, res);
      } catch {
        // chart is optional
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Switch between Bear / Base / Bull scenarios
  const handleScenarioChange = (key: ScenarioKey) => {
    if (!scenarios || !fundamentalsCache) return;
    setScenario(key);
    const res = buildResult(fundamentalsCache, scenarios[key]);
    setResult(res);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 5);
    fetchHistoricalData(symbol, startDate, endDate)
      .then(h => buildChart(fundamentalsCache, h.prices, res))
      .catch(() => {});
  };

  const handleRecalculate = () => {
    if (!fundamentalsCache) return;
    setUseOverrides(true);

    const financialData = fundamentalsCache.financialData || {};
    const summaryDetail = fundamentalsCache.summaryDetail || {};
    const currency = financialData.financialCurrency || summaryDetail.currency || 'INR';

    // Recompute all scenarios anchored on the user's overridden assumptions
    const scen = calculateScenarios(fundamentalsCache, currency, {
      growthRate: growthRate / 100,
      discountRate: discountRate / 100,
      terminalGrowthRate: terminalGrowthRate / 100,
      marginOfSafety: marginOfSafetyPct / 100,
    });
    setScenarios(scen);

    const res = buildResult(fundamentalsCache, scen[scenario]);
    setResult(res);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 5);
    fetchHistoricalData(symbol, startDate, endDate)
      .then(h => buildChart(fundamentalsCache, h.prices, res))
      .catch(() => {});
  };

  // Auto-analyze when navigated here with a symbol (e.g. from the watchlist)
  useEffect(() => {
    const incoming = (location.state as { symbol?: string } | null)?.symbol;
    if (incoming) {
      handleAnalyze(incoming);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  return (
    <>
      <StyledFormContainer>
        <Typography variant='subtitle1' fontWeight={600} sx={{ mb: 2 }}>
          Stock Intrinsic Value & Fundamental Analysis
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
              label='Search Stock'
              variant='outlined'
              size='small'
              placeholder='Type company name or symbol...'
              helperText='e.g. Infosys, TCS, Reliance, Apple, HDFC Bank'
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

        <Button
          variant='contained'
          color='primary'
          onClick={() => handleAnalyze()}
          disabled={loading || !symbol.trim()}
          fullWidth
          size='large'
        >
          {loading ? <CircularProgress size={24} color='inherit' /> : 'Analyze Stock'}
        </Button>
      </StyledFormContainer>

      {error && (
        <Alert severity='error' sx={{ mt: 1 }}>{error}</Alert>
      )}

      {result && (
        <>
          {/* Verdict + Valuation Card */}
          <StyledResultContainer>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant='h6'>{result.symbol}</Typography>
              <Chip
                label={result.verdict}
                sx={{
                  backgroundColor: getVerdictColor(result.verdict),
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  px: 1,
                }}
              />
            </Box>
            <Typography variant='body2' color='textSecondary' sx={{ mb: 2 }}>
              {result.sector} · {result.industry}
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {/* Bear / Base / Bull scenario toggle */}
            {scenarios && (
              <Box sx={{ mb: 2 }}>
                <ToggleButtonGroup
                  value={scenario}
                  exclusive
                  fullWidth
                  size='small'
                  onChange={(_, val) => val && handleScenarioChange(val)}
                >
                  <ToggleButton value='bear' sx={{ textTransform: 'none' }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant='caption' display='block' fontWeight={600}>Bear</Typography>
                      <Typography variant='caption' color='textSecondary'>
                        {scenarios.bear.intrinsicValuePerShare > 0 ? money(scenarios.bear.intrinsicValuePerShare, result.currency) : 'N/A'}
                      </Typography>
                    </Box>
                  </ToggleButton>
                  <ToggleButton value='base' sx={{ textTransform: 'none' }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant='caption' display='block' fontWeight={600}>Base</Typography>
                      <Typography variant='caption' color='textSecondary'>
                        {scenarios.base.intrinsicValuePerShare > 0 ? money(scenarios.base.intrinsicValuePerShare, result.currency) : 'N/A'}
                      </Typography>
                    </Box>
                  </ToggleButton>
                  <ToggleButton value='bull' sx={{ textTransform: 'none' }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant='caption' display='block' fontWeight={600}>Bull</Typography>
                      <Typography variant='caption' color='textSecondary'>
                        {scenarios.bull.intrinsicValuePerShare > 0 ? money(scenarios.bull.intrinsicValuePerShare, result.currency) : 'N/A'}
                      </Typography>
                    </Box>
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            )}

            <Alert
              severity={
                result.verdict === 'BUY' || result.verdict === 'ACCUMULATE'
                  ? 'success'
                  : result.verdict === 'HOLD' ? 'warning' : 'error'
              }
              sx={{ mb: 2 }}
            >
              {getVerdictDescription(result.verdict, result.upsidePct)}
            </Alert>

            {/* Reliability warning when the model is uncertain */}
            {result.confidence.level !== 'high' && result.confidence.reasons.length > 0 && (
              <Alert
                severity={result.confidence.level === 'low' ? 'warning' : 'info'}
                sx={{ mb: 2 }}
              >
                <Typography variant='body2' fontWeight={600} sx={{ mb: 0.5 }}>
                  {result.confidence.level === 'low'
                    ? 'Low confidence — treat this estimate with caution'
                    : 'Moderate confidence — interpret with care'}
                </Typography>
                <Box component='ul' sx={{ m: 0, pl: 2.5 }}>
                  {result.confidence.reasons.map((r, i) => (
                    <li key={i}>
                      <Typography variant='caption'>{r}</Typography>
                    </li>
                  ))}
                </Box>
              </Alert>
            )}

            {/* At-a-glance valuation gauge */}
            {result.intrinsicValue > 0 && (
              <ValuationGauge
                intrinsicValue={result.intrinsicValue}
                price={result.currentPrice}
                format={(n) => money(n, result.currency)}
              />
            )}

            {/* Business quality score */}
            <QualityScoreCard quality={result.quality} />

            {/* Three valuation numbers side by side, AlphaSpread-style */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
                mb: 2,
              }}
            >
              <Box sx={{ flex: 1, textAlign: 'center', p: 1.5, borderRadius: 2, backgroundColor: '#f1f8f4' }}>
                <Typography variant='caption' color='textSecondary'>Intrinsic Value</Typography>
                <Typography variant='h6' fontWeight={700} sx={{ color: '#2e7d5b' }}>
                  {result.intrinsicValue > 0 ? money(result.intrinsicValue, result.currency) : 'N/A'}
                </Typography>
                <Typography variant='caption' color='textSecondary'>avg of DCF & multiples</Typography>
              </Box>
              <Box sx={{ flex: 1, textAlign: 'center', p: 1.5, borderRadius: 2, backgroundColor: '#f5f7fa' }}>
                <Typography variant='caption' color='textSecondary'>DCF Value</Typography>
                <Typography variant='h6' fontWeight={700} sx={{ color: '#1a2a3a' }}>
                  {result.dcfReliable ? money(result.dcfValue, result.currency) : 'N/A'}
                </Typography>
                <Typography variant='caption' color='textSecondary'>
                  {result.dcfMethod === 'Earnings' ? 'earnings based' : 'cash-flow based'}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, textAlign: 'center', p: 1.5, borderRadius: 2, backgroundColor: '#f5f7fa' }}>
                <Typography variant='caption' color='textSecondary'>Relative Value</Typography>
                <Typography variant='h6' fontWeight={700} sx={{ color: '#1a2a3a' }}>
                  {result.relativeReliable ? money(result.relativeValue, result.currency) : 'N/A'}
                </Typography>
                <Typography variant='caption' color='textSecondary'>multiples based</Typography>
              </Box>
            </Box>

            {/* Actionable entry/exit levels */}
            <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5 }}>
              <Box sx={{ flex: 1, p: 1.5, borderRadius: 2, border: '1px solid #eceff1', textAlign: 'center' }}>
                <Typography variant='caption' sx={{ color: '#78909c' }}>Accumulate below</Typography>
                <Typography variant='subtitle1' fontWeight={700} sx={{ color: '#2e7d5b' }}>
                  {money(result.accumulationLevel, result.currency)}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, p: 1.5, borderRadius: 2, border: '1px solid #eceff1', textAlign: 'center' }}>
                <Typography variant='caption' sx={{ color: '#78909c' }}>Consider exit above</Typography>
                <Typography variant='subtitle1' fontWeight={700} sx={{ color: '#c0392b' }}>
                  {money(result.exitLevel, result.currency)}
                </Typography>
              </Box>
            </Box>
          </StyledResultContainer>

          {/* How DCF was calculated — WACC breakdown */}
          {result.wacc && (
            <Accordion sx={{ my: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box>
                  <Typography fontWeight={600}>How the DCF Value Was Calculated</Typography>
                  <Typography variant='caption' color='textSecondary'>
                    Discount rate (WACC): {(result.wacc.wacc * 100).toFixed(1)}% · Growth: {(result.assumptions.initialGrowthRate * 100).toFixed(1)}% → Terminal: {(result.assumptions.terminalGrowthRate * 100).toFixed(1)}%
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant='body2' color='textSecondary' sx={{ mb: 1.5 }}>
                  {result.dcfMethod === 'Earnings'
                    ? `This is a financial/bank-type company, so we project net income (cash flow to equity) for ${result.assumptions.projectionYears} years and discount at the cost of equity.`
                    : `We project free cash flow for ${result.assumptions.projectionYears} years (growth fading toward the terminal rate), add a Gordon-Growth terminal value, and discount everything back at the WACC.`}
                </Typography>
                <Table size='small'>
                  <TableBody>
                    <TableRow>
                      <TableCell>{result.dcfMethod === 'Earnings' ? 'Base Net Income (TTM)' : 'Base Free Cash Flow (TTM)'}</TableCell>
                      <TableCell align='right'><strong>{result.freeCashFlow !== 0 ? formatWithCompact(result.freeCashFlow) : 'N/A'}</strong></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Beta</TableCell>
                      <TableCell align='right'><strong>{result.wacc.beta.toFixed(2)}</strong></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Risk-Free Rate</TableCell>
                      <TableCell align='right'><strong>{(result.wacc.riskFreeRate * 100).toFixed(1)}%</strong></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Equity Risk Premium</TableCell>
                      <TableCell align='right'><strong>{(result.wacc.equityRiskPremium * 100).toFixed(1)}%</strong></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Cost of Equity (CAPM)</TableCell>
                      <TableCell align='right'><strong>{(result.wacc.costOfEquity * 100).toFixed(1)}%</strong></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>After-Tax Cost of Debt</TableCell>
                      <TableCell align='right'><strong>{(result.wacc.costOfDebtAfterTax * 100).toFixed(1)}%</strong></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Equity / Debt Weight</TableCell>
                      <TableCell align='right'><strong>{(result.wacc.equityWeight * 100).toFixed(0)}% / {(result.wacc.debtWeight * 100).toFixed(0)}%</strong></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>WACC (Discount Rate)</strong></TableCell>
                      <TableCell align='right'><strong style={{ color: '#2e7d5b' }}>{(result.wacc.wacc * 100).toFixed(1)}%</strong></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Discount Rate Applied to DCF</strong></TableCell>
                      <TableCell align='right'>
                        <strong style={{ color: '#2e7d5b' }}>
                          {(result.effectiveDiscountRate * 100).toFixed(1)}%
                          {result.dcfMethod === 'Earnings' ? ' (cost of equity)' : ' (WACC)'}
                        </strong>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </AccordionDetails>
            </Accordion>
          )}

          {/* How relative value was calculated */}
          {result.relativeReliable && result.relativeBreakdown.length > 0 && (
            <Accordion sx={{ my: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box>
                  <Typography fontWeight={600}>How the Relative Value Was Calculated</Typography>
                  <Typography variant='caption' color='textSecondary'>
                    Blended across {result.relativeBreakdown.length} sector-multiple methods (outliers trimmed)
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant='body2' color='textSecondary' sx={{ mb: 1.5 }}>
                  Fair value implied by applying {result.sector} sector-average multiples to the company's per-share fundamentals.
                </Typography>
                <Table size='small'>
                  <TableBody>
                    {result.relativeBreakdown.map(b => (
                      <TableRow key={b.method}>
                        <TableCell>{b.method} based fair value</TableCell>
                        <TableCell align='right'><strong>{money(b.fairValue, result.currency)}</strong></TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell><strong>Blended (Relative Value)</strong></TableCell>
                      <TableCell align='right'><strong style={{ color: '#2e7d5b' }}>{money(result.relativeValue, result.currency)}</strong></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Adjustable Parameters — collapsed */}
          <Accordion sx={{ my: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box>
                <Typography fontWeight={600}>Adjust Assumptions {useOverrides ? '(custom)' : '(auto)'}</Typography>
                <Typography variant='caption' color='textSecondary'>
                  Growth: {growthRate}% · Discount: {discountRate}% · Terminal: {terminalGrowthRate}% · Margin of Safety: {marginOfSafetyPct}%
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Alert severity='info' sx={{ mb: 2 }}>
                Values were auto-derived from {result.sector} sector data, the company's beta, growth, and risk profile.
                Override them below and recalculate to run your own scenario.
              </Alert>
              <SliderInput
                label='Growth Rate (Year 1)'
                value={growthRate}
                onChange={setGrowthRate}
                min={1}
                max={50}
                step={0.5}
                suffix='%'
              />
              <SliderInput
                label='Discount Rate (WACC)'
                value={discountRate}
                onChange={setDiscountRate}
                min={5}
                max={25}
                step={0.5}
                suffix='%'
              />
              <SliderInput
                label='Terminal Growth Rate'
                value={terminalGrowthRate}
                onChange={setTerminalGrowthRate}
                min={1}
                max={10}
                step={0.5}
                suffix='%'
              />
              <SliderInput
                label='Margin of Safety'
                value={marginOfSafetyPct}
                onChange={setMarginOfSafetyPct}
                min={10}
                max={50}
                step={5}
                suffix='%'
              />
              <Button
                variant='outlined'
                color='primary'
                onClick={handleRecalculate}
                fullWidth
                size='large'
                sx={{ mt: 1 }}
              >
                Recalculate with My Assumptions
              </Button>
            </AccordionDetails>
          </Accordion>

          {/* Price vs Intrinsic Value Chart */}
          {chartData.length > 0 && (
            <StyledResultContainer>
              <Typography variant='h6' sx={{ mb: 2 }}>
                Market Price vs Intrinsic Value (5 Years)
              </Typography>
              <Typography variant='body2' color='textSecondary' sx={{ mb: 2 }}>
                Historical market price compared to estimated intrinsic value, accumulation zone, and exit zone.
              </Typography>
              <ResponsiveContainer width='100%' height={isMobile ? 280 : 380}>
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 10, left: isMobile ? 0 : 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray='3 3' stroke='#e0e0e0' />
                  <XAxis
                    dataKey='date'
                    tick={{ fontSize: 11 }}
                    interval={isMobile ? Math.floor(chartData.length / 4) : Math.floor(chartData.length / 8)}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => {
                      const sym = result.currency === 'INR' ? '₹' : '$';
                      return v >= 1000 ? `${sym}${(v / 1000).toFixed(1)}k` : `${sym}${v}`;
                    }}
                    width={isMobile ? 48 : 64}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      money(value, result.currency),
                      name,
                    ]}
                    contentStyle={{ fontSize: '0.85rem' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                  <Line type='monotone' dataKey='marketPrice' stroke='#1976d2' name='Market Price' dot={false} strokeWidth={2} />
                  <Line type='monotone' dataKey='intrinsicValue' stroke='#2e7d32' name='Intrinsic Value' dot={false} strokeWidth={2} strokeDasharray='6 3' />
                  <Line type='monotone' dataKey='accumulationLevel' stroke='#f57c00' name='Buy Zone' dot={false} strokeWidth={1} strokeDasharray='3 3' />
                  <Line type='monotone' dataKey='exitLevel' stroke='#c62828' name='Exit Zone' dot={false} strokeWidth={1} strokeDasharray='3 3' />
                </LineChart>
              </ResponsiveContainer>
            </StyledResultContainer>
          )}

          {/* Fundamental Analysis */}
          <StyledResultContainer>
            <Typography variant='h6' sx={{ mb: 2 }}>Fundamental Analysis</Typography>

            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight={600}>Valuation Ratios</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Table size='small'>
                  <TableBody>
                    <TableRow>
                      <TableCell>P/E Ratio (TTM)</TableCell>
                      <TableCell align='right'><strong>{result.peRatio > 0 ? result.peRatio.toFixed(2) : 'N/A'}</strong></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>P/B Ratio</TableCell>
                      <TableCell align='right'><strong>{result.pbRatio > 0 ? result.pbRatio.toFixed(2) : 'N/A'}</strong></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>PEG Ratio</TableCell>
                      <TableCell align='right'><strong>{result.pegRatio > 0 ? result.pegRatio.toFixed(2) : 'N/A'}</strong></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>EPS (TTM)</TableCell>
                      <TableCell align='right'><strong>{result.eps > 0 ? money(result.eps, result.currency) : 'N/A'}</strong></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Book Value</TableCell>
                      <TableCell align='right'><strong>{result.bookValue > 0 ? money(result.bookValue, result.currency) : 'N/A'}</strong></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Dividend Yield</TableCell>
                      <TableCell align='right'><strong>{result.dividendYield > 0 ? `${result.dividendYield.toFixed(2)}%` : 'N/A'}</strong></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </AccordionDetails>
            </Accordion>

            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight={600}>Profitability & Growth</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Table size='small'>
                  <TableBody>
                    <TableRow>
                      <TableCell>Return on Equity (ROE)</TableCell>
                      <TableCell align='right'>
                        <strong style={{ color: result.roe >= 15 ? '#2e7d32' : result.roe >= 10 ? '#f57c00' : '#c62828' }}>
                          {result.roe > 0 ? `${result.roe.toFixed(2)}%` : 'N/A'}
                        </strong>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Operating Margin</TableCell>
                      <TableCell align='right'><strong>{result.operatingMargin !== 0 ? `${result.operatingMargin.toFixed(2)}%` : 'N/A'}</strong></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Net Profit Margin</TableCell>
                      <TableCell align='right'><strong>{result.profitMargin !== 0 ? `${result.profitMargin.toFixed(2)}%` : 'N/A'}</strong></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Revenue Growth (YoY)</TableCell>
                      <TableCell align='right'>
                        <strong style={{ color: result.revenueGrowth >= 10 ? '#2e7d32' : '#c62828' }}>
                          {result.revenueGrowth !== 0 ? `${result.revenueGrowth.toFixed(2)}%` : 'N/A'}
                        </strong>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Earnings Growth (YoY)</TableCell>
                      <TableCell align='right'>
                        <strong style={{ color: result.earningsGrowth >= 10 ? '#2e7d32' : '#c62828' }}>
                          {result.earningsGrowth !== 0 ? `${result.earningsGrowth.toFixed(2)}%` : 'N/A'}
                        </strong>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </AccordionDetails>
            </Accordion>

            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight={600}>Financial Health</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Table size='small'>
                  <TableBody>
                    <TableRow>
                      <TableCell>Debt to Equity</TableCell>
                      <TableCell align='right'>
                        <strong style={{ color: result.debtToEquity <= 50 ? '#2e7d32' : result.debtToEquity <= 100 ? '#f57c00' : '#c62828' }}>
                          {result.debtToEquity > 0 ? `${result.debtToEquity.toFixed(2)}%` : 'N/A'}
                        </strong>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Free Cash Flow</TableCell>
                      <TableCell align='right'>
                        <strong style={{ color: result.freeCashFlow > 0 ? '#2e7d32' : '#c62828' }}>
                          {result.freeCashFlow !== 0 ? formatWithCompact(result.freeCashFlow) : 'N/A'}
                        </strong>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Market Cap</TableCell>
                      <TableCell align='right'><strong>{result.marketCap > 0 ? formatWithCompact(result.marketCap) : 'N/A'}</strong></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </AccordionDetails>
            </Accordion>

            {result.description && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography fontWeight={600}>About the Company</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant='body2' color='textSecondary' sx={{ lineHeight: 1.6 }}>
                    {result.description.length > 500 ? result.description.substring(0, 500) + '...' : result.description}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            )}
          </StyledResultContainer>

          {/* Historical fundamentals dashboard */}
          {analyzedSymbol && (
            <FinancialHistory
              symbol={analyzedSymbol}
              currency={result.currency}
              priceHistory={priceHistory}
            />
          )}

          {/* Disclaimer */}
          <Alert severity='info' sx={{ mt: 1 }}>
            <strong>Disclaimer:</strong> This analysis is for educational purposes only. Intrinsic value is an estimate
            based on DCF and relative-valuation assumptions derived from public data. Always do your own research and
            consider consulting a financial advisor before making investment decisions.
          </Alert>
        </>
      )}
    </>
  );
};

export default StockIntrinsicValueForm;
