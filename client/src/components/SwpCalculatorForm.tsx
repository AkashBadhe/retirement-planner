import React, { useMemo } from 'react';
import { useState } from 'react';
import { Paper, Typography, Divider } from '@mui/material';
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

const NegativeValue = styled(Typography)`
  font-weight: 700;
  color: #c0392b;
  font-size: 1.25rem;
`;

const SwpCalculatorForm: React.FC = () => {
  const [totalInvestment, setTotalInvestment] = useState(500000);
  const [withdrawalPerMonth, setWithdrawalPerMonth] = useState(10000);
  const [expectedReturns, setExpectedReturns] = useState(8);
  const [timePeriod, setTimePeriod] = useState(5);

  const results = useMemo(() => {
    const monthlyRate = expectedReturns / 12 / 100;
    const months = timePeriod * 12;
    const totalWithdrawal = withdrawalPerMonth * months;

    // Calculate final value after SWP
    let balance = totalInvestment;
    for (let i = 0; i < months; i++) {
      balance = balance * (1 + monthlyRate) - withdrawalPerMonth;
      if (balance < 0) {
        balance = 0;
        break;
      }
    }

    // Calculate max sustainable withdrawal (balance = 0 at end)
    // Formula: PMT = PV × r / (1 - (1+r)^(-n))
    let maxWithdrawal = 0;
    if (monthlyRate > 0) {
      maxWithdrawal =
        (totalInvestment * monthlyRate) /
        (1 - Math.pow(1 + monthlyRate, -months));
    } else {
      maxWithdrawal = totalInvestment / months;
    }

    return {
      totalInvestment,
      totalWithdrawal,
      finalValue: balance,
      maxWithdrawal: Math.floor(maxWithdrawal),
      isDepleted: balance === 0,
    };
  }, [totalInvestment, withdrawalPerMonth, expectedReturns, timePeriod]);

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

  return (
    <>
      <StyledFormContainer>
        <SliderInput
          label='Total Investment'
          value={totalInvestment}
          onChange={setTotalInvestment}
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
          label='Withdrawal per Month'
          value={withdrawalPerMonth}
          onChange={setWithdrawalPerMonth}
          min={1000}
          max={1000000}
          step={1000}
          prefix='₹'
          formatDisplay={v =>
            v >= 1e5
              ? `${(v / 1e5).toFixed(2)} Lac`
              : v.toLocaleString('en-IN')
          }
        />

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
          max={30}
          suffix='Yr'
        />
      </StyledFormContainer>

      <StyledResultContainer>
        <ResultRow>
          <ResultLabel variant='body1'>Total Investment</ResultLabel>
          <ResultValue variant='body1'>
            {formatWithCompact(results.totalInvestment)}
          </ResultValue>
        </ResultRow>

        <Divider />

        <ResultRow>
          <ResultLabel variant='body1'>Total Withdrawal</ResultLabel>
          <ResultValue variant='body1'>
            {formatWithCompact(results.totalWithdrawal)}
          </ResultValue>
        </ResultRow>

        <Divider />

        <ResultRow>
          <ResultLabel variant='body1'>Final Value</ResultLabel>
          {results.finalValue > 0 ? (
            <HighlightValue>{formatWithCompact(results.finalValue)}</HighlightValue>
          ) : (
            <NegativeValue>₹0 (Depleted)</NegativeValue>
          )}
        </ResultRow>

        {results.isDepleted && (
          <>
            <Divider />
            <ResultRow>
              <div>
                <ResultLabel variant='body1'>Max Sustainable Withdrawal</ResultLabel>
                <Typography variant='caption' color='textSecondary'>
                  Maximum you can withdraw monthly for {timePeriod} years without running out
                </Typography>
              </div>
              <HighlightValue>{formatWithCompact(results.maxWithdrawal)}/mo</HighlightValue>
            </ResultRow>
          </>
        )}
      </StyledResultContainer>
    </>
  );
};

export default SwpCalculatorForm;
