import React, { useState, useMemo } from 'react';
import {
  Paper,
  Typography,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Box,
  Button,
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

type Mode = 'cagr' | 'reverse';

const CagrCalculatorForm: React.FC = () => {
  const [mode, setMode] = useState<Mode>('cagr');

  // CAGR mode: find the growth rate
  const [cagrInitialAmount, setCagrInitialAmount] = useState(100000);
  const [cagrFinalAmount, setCagrFinalAmount] = useState(500000);
  const [cagrYears, setCagrYears] = useState(5);

  // Reverse CAGR mode: find the future value
  const [reverseInitialAmount, setReverseInitialAmount] = useState(100000);
  const [reverseYears, setReverseYears] = useState(5);
  const [reverseCagrRate, setReverseCagrRate] = useState(12);

  const [showResults, setShowResults] = useState(false);

  const cagrResult = useMemo(() => {
    if (cagrInitialAmount <= 0 || cagrFinalAmount <= 0 || cagrYears <= 0) {
      return 0;
    }
    // CAGR = (FV/PV)^(1/n) - 1
    return (
      (Math.pow(cagrFinalAmount / cagrInitialAmount, 1 / cagrYears) - 1) * 100
    );
  }, [cagrInitialAmount, cagrFinalAmount, cagrYears]);

  const reverseResult = useMemo(() => {
    if (reverseInitialAmount <= 0 || reverseYears <= 0) {
      return 0;
    }
    // FV = PV × (1 + CAGR)^n
    return reverseInitialAmount * Math.pow(1 + reverseCagrRate / 100, reverseYears);
  }, [reverseInitialAmount, reverseYears, reverseCagrRate]);

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

  function formatCompact(num: number): string {
    const absNum = Math.abs(num);
    if (absNum >= 1e7) {
      return `${(absNum / 1e7).toFixed(2)} Cr`;
    } else if (absNum >= 1e5) {
      return `${(absNum / 1e5).toFixed(2)} Lac`;
    }
    return Math.round(absNum).toLocaleString('en-IN');
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

  const handleCalculate = () => {
    setShowResults(true);
  };

  const handleReset = () => {
    setShowResults(false);
    if (mode === 'cagr') {
      setCagrInitialAmount(100000);
      setCagrFinalAmount(500000);
      setCagrYears(5);
    } else {
      setReverseInitialAmount(100000);
      setReverseYears(5);
      setReverseCagrRate(12);
    }
  };

  return (
    <>
      <StyledFormContainer>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, val) => {
            if (val) {
              setMode(val);
              setShowResults(false);
            }
          }}
          sx={{ mb: 3 }}
          size='small'
        >
          <ToggleButton value='cagr' sx={{ px: 3 }}>
            CAGR
          </ToggleButton>
          <ToggleButton value='reverse' sx={{ px: 3 }}>
            Reverse CAGR
          </ToggleButton>
        </ToggleButtonGroup>

        <Typography variant='subtitle1' fontWeight={600} sx={{ mb: 2 }}>
          {mode === 'cagr' ? 'Calculate CAGR' : 'Calculate Future Value'}
        </Typography>

        {mode === 'cagr' ? (
          <>
            <SliderInput
              label='Initial Amount'
              value={cagrInitialAmount}
              onChange={setCagrInitialAmount}
              min={1000}
              max={100000000}
              step={1000}
              prefix='₹'
              formatDisplay={v =>
                v >= 1e7
                  ? `${(v / 1e7).toFixed(2)} Cr`
                  : v >= 1e5
                    ? `${(v / 1e5).toFixed(2)} Lac`
                    : v.toLocaleString('en-IN')
              }
            />
            <SliderInput
              label='Final Amount'
              value={cagrFinalAmount}
              onChange={setCagrFinalAmount}
              min={1000}
              max={100000000}
              step={1000}
              prefix='₹'
              formatDisplay={v =>
                v >= 1e7
                  ? `${(v / 1e7).toFixed(2)} Cr`
                  : v >= 1e5
                    ? `${(v / 1e5).toFixed(2)} Lac`
                    : v.toLocaleString('en-IN')
              }
            />
            <SliderInput
              label='Time Period'
              value={cagrYears}
              onChange={setCagrYears}
              min={1}
              max={50}
              suffix='Yr'
            />
          </>
        ) : (
          <>
            <SliderInput
              label='Initial Amount'
              value={reverseInitialAmount}
              onChange={setReverseInitialAmount}
              min={1000}
              max={100000000}
              step={1000}
              prefix='₹'
              formatDisplay={v =>
                v >= 1e7
                  ? `${(v / 1e7).toFixed(2)} Cr`
                  : v >= 1e5
                    ? `${(v / 1e5).toFixed(2)} Lac`
                    : v.toLocaleString('en-IN')
              }
            />
            <SliderInput
              label='CAGR'
              value={reverseCagrRate}
              onChange={setReverseCagrRate}
              min={1}
              max={100}
              step={0.5}
              suffix='%'
            />
            <SliderInput
              label='Time Period'
              value={reverseYears}
              onChange={setReverseYears}
              min={1}
              max={50}
              suffix='Yr'
            />
          </>
        )}

        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button
            variant='contained'
            color='primary'
            onClick={handleCalculate}
            sx={{ flex: 1 }}
            size='large'
          >
            Calculate
          </Button>
          <Button
            variant='outlined'
            onClick={handleReset}
            sx={{ flex: 1 }}
            size='large'
          >
            Reset
          </Button>
        </Box>
      </StyledFormContainer>

      {showResults && (
        <StyledResultContainer>
          {mode === 'cagr' ? (
            <>
              <ResultRow>
                <ResultLabel variant='body1'>Initial Investment</ResultLabel>
                <ResultValue variant='body1'>
                  {formatWithCompact(cagrInitialAmount)}
                </ResultValue>
              </ResultRow>
              <Divider />
              <ResultRow>
                <ResultLabel variant='body1'>Final Value</ResultLabel>
                <ResultValue variant='body1'>
                  {formatWithCompact(cagrFinalAmount)}
                </ResultValue>
              </ResultRow>
              <Divider />
              <ResultRow>
                <ResultLabel variant='body1'>Duration</ResultLabel>
                <ResultValue variant='body1'>{cagrYears} years</ResultValue>
              </ResultRow>
              <Divider />
              <ResultRow>
                <ResultLabel variant='body1'>CAGR</ResultLabel>
                <HighlightValue>{cagrResult.toFixed(2)}%</HighlightValue>
              </ResultRow>
              <Divider />
              <ResultRow>
                <ResultLabel variant='body1'>
                  Absolute Returns
                </ResultLabel>
                <ResultValue variant='body1'>
                  {(((cagrFinalAmount - cagrInitialAmount) / cagrInitialAmount) * 100).toFixed(2)}%
                </ResultValue>
              </ResultRow>
            </>
          ) : (
            <>
              <ResultRow>
                <ResultLabel variant='body1'>Initial Investment</ResultLabel>
                <ResultValue variant='body1'>
                  {formatWithCompact(reverseInitialAmount)}
                </ResultValue>
              </ResultRow>
              <Divider />
              <ResultRow>
                <ResultLabel variant='body1'>CAGR Applied</ResultLabel>
                <ResultValue variant='body1'>{reverseCagrRate}%</ResultValue>
              </ResultRow>
              <Divider />
              <ResultRow>
                <ResultLabel variant='body1'>Duration</ResultLabel>
                <ResultValue variant='body1'>{reverseYears} years</ResultValue>
              </ResultRow>
              <Divider />
              <ResultRow>
                <ResultLabel variant='body1'>Future Value</ResultLabel>
                <HighlightValue>
                  {formatWithCompact(reverseResult)}
                </HighlightValue>
              </ResultRow>
              <Divider />
              <ResultRow>
                <ResultLabel variant='body1'>Total Growth</ResultLabel>
                <ResultValue variant='body1'>
                  {formatWithCompact(reverseResult - reverseInitialAmount)}
                </ResultValue>
              </ResultRow>
            </>
          )}
        </StyledResultContainer>
      )}
    </>
  );
};

export default CagrCalculatorForm;
