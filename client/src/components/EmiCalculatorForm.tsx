import React, { useMemo } from 'react';
import { useState } from 'react';
import { Paper, Typography, Divider, Box } from '@mui/material';
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

// Donut chart for principal vs interest
const DonutChart: React.FC<{ principal: number; interest: number }> = ({
  principal,
  interest,
}) => {
  const total = principal + interest;
  const interestPercent = total > 0 ? (interest / total) * 100 : 0;

  const radius = 80;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;
  const interestStroke = (interestPercent / 100) * circumference;

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
          <Typography variant='caption'>Principal</Typography>
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
          <Typography variant='caption'>Interest</Typography>
        </Box>
      </Box>
      <svg width='200' height='200' viewBox='0 0 200 200'>
        <circle
          cx='100'
          cy='100'
          r={radius}
          fill='none'
          stroke='#dce3e8'
          strokeWidth={strokeWidth}
        />
        <circle
          cx='100'
          cy='100'
          r={radius}
          fill='none'
          stroke='#1a3a5c'
          strokeWidth={strokeWidth}
          strokeDasharray={`${interestStroke} ${circumference - interestStroke}`}
          strokeDashoffset={circumference * 0.25}
          strokeLinecap='round'
          style={{ transition: 'stroke-dasharray 0.3s ease' }}
        />
      </svg>
    </Box>
  );
};

const EmiCalculatorForm: React.FC = () => {
  const [loanAmount, setLoanAmount] = useState(1000000);
  const [interestRate, setInterestRate] = useState(6.5);
  const [loanTenure, setLoanTenure] = useState(5);

  const results = useMemo(() => {
    const monthlyRate = interestRate / 12 / 100;
    const months = loanTenure * 12;

    if (monthlyRate === 0) {
      const emi = loanAmount / months;
      return {
        emi,
        totalInterest: 0,
        totalAmount: loanAmount,
      };
    }

    // EMI = P × r × (1+r)^n / ((1+r)^n - 1)
    const emi =
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
      (Math.pow(1 + monthlyRate, months) - 1);

    const totalAmount = emi * months;
    const totalInterest = totalAmount - loanAmount;

    return { emi, totalInterest, totalAmount };
  }, [loanAmount, interestRate, loanTenure]);

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

  return (
    <>
      <StyledFormContainer>
        <Box
          sx={{
            display: 'flex',
            gap: 4,
            flexDirection: { xs: 'column', md: 'row' },
          }}
        >
          <Box sx={{ flex: 1 }}>
            <SliderInput
              label='Loan Amount'
              value={loanAmount}
              onChange={setLoanAmount}
              min={50000}
              max={100000000}
              step={50000}
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
              label='Rate of Interest (p.a)'
              value={interestRate}
              onChange={setInterestRate}
              min={1}
              max={30}
              step={0.1}
              suffix='%'
            />

            <SliderInput
              label='Loan Tenure'
              value={loanTenure}
              onChange={setLoanTenure}
              min={1}
              max={30}
              suffix='Yr'
            />
          </Box>

          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
            }}
          >
            <DonutChart
              principal={loanAmount}
              interest={results.totalInterest}
            />
          </Box>
        </Box>
      </StyledFormContainer>

      <StyledResultContainer>
        <ResultRow>
          <ResultLabel variant='body1'>Monthly EMI</ResultLabel>
          <HighlightValue>{formatWithCompact(results.emi)}</HighlightValue>
        </ResultRow>

        <Divider />

        <ResultRow>
          <ResultLabel variant='body1'>Principal Amount</ResultLabel>
          <ResultValue variant='body1'>
            {formatWithCompact(loanAmount)}
          </ResultValue>
        </ResultRow>

        <Divider />

        <ResultRow>
          <ResultLabel variant='body1'>Total Interest</ResultLabel>
          <ResultValue variant='body1'>
            {formatWithCompact(results.totalInterest)}
          </ResultValue>
        </ResultRow>

        <Divider />

        <ResultRow>
          <ResultLabel variant='body1'>Total Amount</ResultLabel>
          <ResultValue variant='body1'>
            {formatWithCompact(results.totalAmount)}
          </ResultValue>
        </ResultRow>
      </StyledResultContainer>
    </>
  );
};

export default EmiCalculatorForm;
