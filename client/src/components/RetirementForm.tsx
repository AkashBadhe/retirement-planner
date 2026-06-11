// components/RetirementForm.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Paper,
  Typography,
  FormControlLabel,
  Checkbox,
  Divider,
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

const RetirementForm: React.FC = () => {
  const [currentAge, setCurrentAge] = useState(32);
  const [retirementAge, setRetirementAge] = useState(42);
  const [monthlyPensionRequired, setMonthlyPensionRequired] = useState(300000);
  const [lumpSumAmount, setLumpSumAmount] = useState(10000000);
  const [calculatedAmounts, setCalculatedAmounts] = useState({
    sipAmount: 0,
    extraAmountAtStartOfRetirement: 0,
    futuralValueOfExtraAmount: 0,
  });
  const [pensionTenure, setPensionTenure] = useState(30);
  const [expectedReturns, setExpectedReturns] = useState(12);
  const [considerInflation, setConsiderInflation] = useState(false);
  const [inflationRate, setInflationRate] = useState(6);
  const [showResults, setShowResults] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    calculateRetirementSavings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentAge,
    retirementAge,
    monthlyPensionRequired,
    pensionTenure,
    expectedReturns,
    lumpSumAmount,
    considerInflation,
    inflationRate,
  ]);

  useEffect(() => {
    if (showResults && resultRef.current) {
      resultRef.current?.scrollIntoView?.({ behavior: 'smooth' });
    }
  }, [showResults]);

  const calculateRetirementSavings = () => {
    const yearsUntilRetirement = retirementAge - currentAge;
    if (yearsUntilRetirement <= 0) return;

    const calculatedAmt = calculateRequiredSIP({
      sipPeriodYears: yearsUntilRetirement,
      monthlyPensionRequirement: monthlyPensionRequired,
      lumpSumAmount: lumpSumAmount,
      withdrawalPeriodYears: pensionTenure,
      expectedReturnsPercent: expectedReturns,
      considerInflation,
      inflationRatePercent: considerInflation ? inflationRate : 0,
    });

    setCalculatedAmounts(calculatedAmt);
  };

  function calculateRequiredSIP({
    sipPeriodYears,
    monthlyPensionRequirement,
    lumpSumAmount,
    withdrawalPeriodYears,
    expectedReturnsPercent,
    considerInflation,
    inflationRatePercent,
  }: {
    sipPeriodYears: number;
    monthlyPensionRequirement: number;
    lumpSumAmount: number;
    withdrawalPeriodYears: number;
    expectedReturnsPercent: number;
    considerInflation: boolean;
    inflationRatePercent: number;
  }) {
    const yearlyReturnRate = expectedReturnsPercent / 100;
    const monthlyReturnRate = expectedReturnsPercent / 12 / 100;
    const sipPeriodMonths = sipPeriodYears * 12;
    const withdrawalPeriodMonths = withdrawalPeriodYears * 12;

    // Adjust monthly pension for inflation to retirement date
    let adjustedMonthlyPension = monthlyPensionRequirement;
    if (considerInflation && inflationRatePercent > 0) {
      adjustedMonthlyPension =
        monthlyPensionRequirement *
        Math.pow(1 + inflationRatePercent / 100, sipPeriodYears);
    }

    // Compounded Amount of Lump Sum (Future Value)
    const FVLumpSum =
      lumpSumAmount * Math.pow(1 + yearlyReturnRate, sipPeriodYears);

    // Total Future Value needed during withdrawal period
    // If inflation is considered, use a growing annuity formula
    // where withdrawals increase by inflation rate each month
    let FVTotal: number;

    if (considerInflation && inflationRatePercent > 0) {
      // Growing annuity: pension increases monthly by inflation
      // Real monthly rate = (1 + nominal monthly rate) / (1 + monthly inflation) - 1
      const monthlyInflationRate = inflationRatePercent / 12 / 100;
      const realMonthlyRate =
        (1 + monthlyReturnRate) / (1 + monthlyInflationRate) - 1;

      if (Math.abs(realMonthlyRate) < 1e-10) {
        // Edge case: real rate ≈ 0, present value is simply n * payment
        FVTotal = adjustedMonthlyPension * withdrawalPeriodMonths;
      } else {
        // Present value of growing annuity (at retirement)
        // PV = P × [(1 - ((1+g)/(1+r))^n) / (r - g)]
        // where P = first month pension, g = monthly inflation, r = monthly return, n = months
        FVTotal =
          adjustedMonthlyPension *
          ((1 - Math.pow((1 + monthlyInflationRate) / (1 + monthlyReturnRate), withdrawalPeriodMonths)) /
            (monthlyReturnRate - monthlyInflationRate));
      }
    } else {
      // Standard level annuity (no inflation during withdrawal)
      FVTotal =
        adjustedMonthlyPension *
        ((1 - Math.pow(1 + monthlyReturnRate, -withdrawalPeriodMonths)) /
          monthlyReturnRate) *
        (1 + monthlyReturnRate);
    }

    // Adjusted Future Value needed
    const adjustedFVNeeded = FVTotal - FVLumpSum;

    let sipAmount = 0;
    let futuralValueOfExtraAmount = 0;
    const extraAmountAtStartOfRetirement = adjustedFVNeeded * -1;

    if (adjustedFVNeeded > 0) {
      sipAmount =
        adjustedFVNeeded /
        (((Math.pow(1 + monthlyReturnRate, sipPeriodMonths) - 1) /
          monthlyReturnRate) *
          (1 + monthlyReturnRate));
    } else {
      const extraAmountAcquired = extraAmountAtStartOfRetirement;
      const withdrawalPeriodInYear = withdrawalPeriodMonths / 12;
      futuralValueOfExtraAmount =
        extraAmountAcquired *
        Math.pow(1 + yearlyReturnRate, withdrawalPeriodInYear);
    }

    return {
      sipAmount,
      extraAmountAtStartOfRetirement,
      futuralValueOfExtraAmount,
    };
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

  const onCalculate = () => {
    setShowResults(true);
    calculateRetirementSavings();
    if (showResults && resultRef.current) {
      resultRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <StyledFormContainer>
        <SliderInput
          label='Current Age'
          value={currentAge}
          onChange={setCurrentAge}
          min={18}
          max={70}
          suffix='Yr'
        />

        <SliderInput
          label='Retirement Age'
          value={retirementAge}
          onChange={setRetirementAge}
          min={30}
          max={80}
          suffix='Yr'
        />

        <SliderInput
          label='Monthly Pension Required'
          value={monthlyPensionRequired}
          onChange={setMonthlyPensionRequired}
          min={10000}
          max={5000000}
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

        <SliderInput
          label='Pension Tenure'
          value={pensionTenure}
          onChange={setPensionTenure}
          min={5}
          max={50}
          suffix='Yr'
        />

        <SliderInput
          label='Expected Annual Returns'
          value={expectedReturns}
          onChange={setExpectedReturns}
          min={1}
          max={30}
          step={0.5}
          suffix='%'
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={considerInflation}
              onChange={e => setConsiderInflation(e.target.checked)}
              color='primary'
            />
          }
          label='Consider inflation'
          sx={{ mb: 1 }}
        />

        {considerInflation && (
          <SliderInput
            label='Inflation Rate'
            value={inflationRate}
            onChange={setInflationRate}
            min={1}
            max={15}
            step={0.5}
            suffix='%'
          />
        )}

        <SliderInput
          label='Existing Investments (Lump Sum)'
          value={lumpSumAmount}
          onChange={setLumpSumAmount}
          min={0}
          max={100000000}
          step={100000}
          prefix='₹'
          formatDisplay={v =>
            v >= 1e7
              ? `${(v / 1e7).toFixed(2)} Cr`
              : v >= 1e5
                ? `${(v / 1e5).toFixed(2)} Lac`
                : v.toLocaleString('en-IN')
          }
        />

        <Button
          variant='contained'
          color='primary'
          onClick={onCalculate}
          fullWidth
          size='large'
          sx={{ mt: 1 }}
        >
          Calculate
        </Button>
      </StyledFormContainer>

      {showResults && (
        <StyledResultContainer ref={resultRef} data-testid='calculation-result'>
          <Typography variant='h6' gutterBottom>
            Results
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <ResultRow>
            <div>
              <ResultLabel variant='body1'>Monthly Pension (in today's value)</ResultLabel>
              <Typography variant='caption' color='textSecondary'>
                {considerInflation
                  ? `₹${formatCompact(monthlyPensionRequired)}/month in today's terms, increasing yearly with inflation during retirement`
                  : 'The amount you want every month after retiring'}
              </Typography>
            </div>
            <ResultValue variant='body1'>
              {formatWithCompact(monthlyPensionRequired)}
            </ResultValue>
          </ResultRow>

          <ResultRow>
            <ResultLabel variant='body1'>Pension Duration</ResultLabel>
            <ResultValue variant='body1'>{pensionTenure} years</ResultValue>
          </ResultRow>

          <Divider sx={{ my: 2 }} />

          {calculatedAmounts.sipAmount > 0 ? (
            <ResultRow>
              <div>
                <ResultLabel variant='body1'>Monthly SIP Required</ResultLabel>
                <Typography variant='caption' color='textSecondary'>
                  Extra monthly investment needed to reach your goal
                </Typography>
              </div>
              <HighlightValue>
                {formatWithCompact(calculatedAmounts.sipAmount)} / month
              </HighlightValue>
            </ResultRow>
          ) : (
            <>
              <ResultRow>
                <div>
                  <ResultLabel variant='body1'>
                    Extra Money at Retirement
                  </ResultLabel>
                  <Typography variant='caption' color='textSecondary'>
                    Your investments already cover your pension goal — this is the leftover amount
                  </Typography>
                </div>
                <HighlightValue>
                  {formatWithCompact(
                    calculatedAmounts.extraAmountAtStartOfRetirement,
                  )}
                </HighlightValue>
              </ResultRow>
              <ResultRow>
                <div>
                  <ResultLabel variant='body1'>
                    If You Keep the Extra Invested
                  </ResultLabel>
                  <Typography variant='caption' color='textSecondary'>
                    The surplus grows to this amount by the end of your pension period
                  </Typography>
                </div>
                <ResultValue variant='body1'>
                  {formatWithCompact(
                    calculatedAmounts.futuralValueOfExtraAmount,
                  )}
                </ResultValue>
              </ResultRow>
            </>
          )}
        </StyledResultContainer>
      )}
    </>
  );
};

export default RetirementForm;
