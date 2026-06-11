import React, { useState, useMemo } from 'react';
import {
  Paper,
  Typography,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Box,
} from '@mui/material';
import styled from 'styled-components';
import SliderInput from './SliderInput';

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

// Donut chart component
const DonutChart: React.FC<{ invested: number; returns: number }> = ({
  invested,
  returns,
}) => {
  const total = invested + returns;
  const returnsPercent = total > 0 ? (returns / total) * 100 : 0;

  // SVG donut chart
  const radius = 80;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;
  const returnsStroke = (returnsPercent / 100) * circumference;

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: '#dce3e8',
            }}
          />
          <Typography variant='caption'>Invested</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: '#1a3a5c',
            }}
          />
          <Typography variant='caption'>Est. returns</Typography>
        </Box>
      </Box>
      <svg width='200' height='200' viewBox='0 0 200 200'>
        {/* Background circle (invested) */}
        <circle
          cx='100'
          cy='100'
          r={radius}
          fill='none'
          stroke='#dce3e8'
          strokeWidth={strokeWidth}
        />
        {/* Returns arc */}
        <circle
          cx='100'
          cy='100'
          r={radius}
          fill='none'
          stroke='#1a3a5c'
          strokeWidth={strokeWidth}
          strokeDasharray={`${returnsStroke} ${circumference - returnsStroke}`}
          strokeDashoffset={circumference * 0.25}
          strokeLinecap='round'
          style={{ transition: 'stroke-dasharray 0.3s ease' }}
        />
      </svg>
    </Box>
  );
};

type Mode = 'sip' | 'lumpsum';

const SipCalculatorForm: React.FC = () => {
  const [mode, setMode] = useState<Mode>('sip');
  const [monthlyInvestment, setMonthlyInvestment] = useState(25000);
  const [lumpSumInvestment, setLumpSumInvestment] = useState(500000);
  const [expectedReturns, setExpectedReturns] = useState(12);
  const [timePeriod, setTimePeriod] = useState(10);

  const results = useMemo(() => {
    const monthlyRate = expectedReturns / 12 / 100;
    const months = timePeriod * 12;

    if (mode === 'sip') {
      const invested = monthlyInvestment * months;
      // FV of SIP = P × [((1+r)^n - 1) / r] × (1+r)
      const futureValue =
        monthlyInvestment *
        (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) *
          (1 + monthlyRate));
      const returns = futureValue - invested;
      return { invested, returns, total: futureValue };
    } else {
      const invested = lumpSumInvestment;
      const futureValue =
        lumpSumInvestment * Math.pow(1 + expectedReturns / 100, timePeriod);
      const returns = futureValue - invested;
      return { invested, returns, total: futureValue };
    }
  }, [mode, monthlyInvestment, lumpSumInvestment, expectedReturns, timePeriod]);

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
    return `₹${result}`;
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

  return (
    <>
      <StyledFormContainer>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, val) => val && setMode(val)}
          sx={{ mb: 3 }}
          size='small'
        >
          <ToggleButton value='sip' sx={{ px: 3 }}>
            SIP
          </ToggleButton>
          <ToggleButton value='lumpsum' sx={{ px: 3 }}>
            Lumpsum
          </ToggleButton>
        </ToggleButtonGroup>

        <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' } }}>
          <Box sx={{ flex: 1 }}>
            {mode === 'sip' ? (
              <SliderInput
                label='Monthly Investment'
                value={monthlyInvestment}
                onChange={setMonthlyInvestment}
                min={500}
                max={1000000}
                step={500}
                prefix='₹'
                formatDisplay={v =>
                  v >= 1e7
                    ? `${(v / 1e7).toFixed(2)} Cr`
                    : v >= 1e5
                      ? `${(v / 1e5).toFixed(2)} Lac`
                      : v.toLocaleString('en-IN')
                }
              />
            ) : (
              <SliderInput
                label='Total Investment'
                value={lumpSumInvestment}
                onChange={setLumpSumInvestment}
                min={10000}
                max={100000000}
                step={10000}
                prefix='₹'
                formatDisplay={v =>
                  v >= 1e7
                    ? `${(v / 1e7).toFixed(2)} Cr`
                    : v >= 1e5
                      ? `${(v / 1e5).toFixed(2)} Lac`
                      : v.toLocaleString('en-IN')
                }
              />
            )}

            <SliderInput
              label='Expected Return Rate (p.a)'
              value={expectedReturns}
              onChange={setExpectedReturns}
              min={1}
              max={30}
              step={0.5}
              suffix='%'
            />

            <SliderInput
              label='Time Period'
              value={timePeriod}
              onChange={setTimePeriod}
              min={1}
              max={40}
              suffix='Yr'
            />
          </Box>

          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
            <DonutChart invested={results.invested} returns={results.returns} />
          </Box>
        </Box>
      </StyledFormContainer>

      <StyledResultContainer>
        <ResultRow>
          <ResultLabel variant='body1'>Invested Amount</ResultLabel>
          <ResultValue variant='body1'>
            {formatWithCompact(results.invested)}
          </ResultValue>
        </ResultRow>

        <Divider />

        <ResultRow>
          <ResultLabel variant='body1'>Est. Returns</ResultLabel>
          <ResultValue variant='body1'>
            {formatWithCompact(results.returns)}
          </ResultValue>
        </ResultRow>

        <Divider />

        <ResultRow>
          <ResultLabel variant='body1'>Total Value</ResultLabel>
          <HighlightValue>{formatWithCompact(results.total)}</HighlightValue>
        </ResultRow>
      </StyledResultContainer>
    </>
  );
};

export default SipCalculatorForm;
