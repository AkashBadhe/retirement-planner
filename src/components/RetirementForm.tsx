// components/RetirementForm.tsx
import React, { useEffect, useRef, useState } from 'react';
import { TextField, Button, Paper } from '@mui/material';
import styled from 'styled-components';

// Define the styled component
const StyledAmount = styled.b`
  font-size: 20px;
`;
const StyledMessageContainer = styled(Paper)`
  padding: 1rem;
  border: 1px solid #ccc;
  margin: 2rem 0;
`;

const StyledResult = styled.li`
  font-size: 16px;
`;

const StyledFormContainer = styled(Paper)`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 2rem;
  border: 1px solid #ccc;
  margin: 2rem 0;
`;

const RetirementForm: React.FC = () => {
  const [currentAge, setCurrentAge] = useState('32');
  const [retirementAge, setRetirementAge] = useState('42');
  const [monthlyPensionRequired, setMonthlyPensionRequired] =
    useState('300000');
  const [lumpSumAmount, setLumpSumAmount] = useState('10000000');
  const [calculatedAmounts, setCalculatedAmounts] = useState({
    sipAmount: 0,
    extraAmountAtStartOfRetirement: 0,
    futuralValueOfExtraAmount: 0,
  });
  const [pensionTenure, setPensionTenure] = useState('30');
  const [expectedReturns, setExpectedReturns] = useState('12');
  const [showResults, setShowResults] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    calculateRetirementSavings();
  }, [
    currentAge,
    retirementAge,
    monthlyPensionRequired,
    pensionTenure,
    expectedReturns,
    lumpSumAmount,
  ]);

  useEffect(() => {
    if (showResults && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [showResults]);

  const calculateRetirementSavings = () => {
    const yearsUntilRetirement = parseInt(retirementAge) - parseInt(currentAge);
    const calculatedAmt = calculateRequiredSIP({
      sipPeriodYears: yearsUntilRetirement,
      monthlyPensionRequirement: parseInt(monthlyPensionRequired),
      lumpSumAmount: parseInt(lumpSumAmount),
      withdrawalPeriodYears: parseInt(pensionTenure),
      expectedReturnsPercent: parseInt(expectedReturns),
    });

    setCalculatedAmounts(calculatedAmt);
  };

  function calculateRequiredSIP({
    sipPeriodYears,
    monthlyPensionRequirement,
    lumpSumAmount,
    withdrawalPeriodYears,
    expectedReturnsPercent,
  }: {
    sipPeriodYears: number;
    monthlyPensionRequirement: number;
    lumpSumAmount: number;
    withdrawalPeriodYears: number;
    expectedReturnsPercent: number;
  }): {
    sipAmount: number;
    extraAmountAtStartOfRetirement: number;
    futuralValueOfExtraAmount: number;
  } {
    const yearlyReturnRate = expectedReturnsPercent / 100;
    const monthlyReturnRate = expectedReturnsPercent / 12 / 100;
    const sipPeriodMonths = sipPeriodYears * 12;
    const withdrawalPeriodMonths = withdrawalPeriodYears * 12;

    // Compounded Amount of Lump Sum (Future Value)
    const FVLumpSum =
      lumpSumAmount * Math.pow(1 + yearlyReturnRate, sipPeriodYears);

    console.log('🚀 ~ FVLumpSum:', FVLumpSum);

    // Total Future Value needed
    const FVTotal =
      monthlyPensionRequirement *
      ((1 - Math.pow(1 + monthlyReturnRate, -withdrawalPeriodMonths)) /
        monthlyReturnRate) *
      (1 + monthlyReturnRate);

    console.log('🚀 ~ FVTotal:', FVTotal);

    // Adjusted Future Value needed (subtracting the future value of the lump sum)
    const adjustedFVNeeded = FVTotal - FVLumpSum;

    console.log('🚀 ~ adjustedFVNeeded:', adjustedFVNeeded);

    let sipAmount = 0;
    let futuralValueOfExtraAmount = 0;

    const extraAmountAtStartOfRetirement = adjustedFVNeeded * -1;

    if (adjustedFVNeeded > 0) {
      // Solve for SIP amount
      sipAmount =
        adjustedFVNeeded /
        (((Math.pow(1 + monthlyReturnRate, sipPeriodMonths) - 1) /
          monthlyReturnRate) *
          (1 + monthlyReturnRate));

      console.log('🚀 ~ sipAmount:', sipAmount);
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

  function formatAmount(amount: string) {
    const num = Number(amount);
    if (num >= 1e7) {
      // 1 crore or more
      return `${(num / 1e7).toFixed(2)} Cr`;
    } else if (num >= 1e5) {
      // 1 lakh or more
      return `${(num / 1e5).toFixed(2)} Lac`;
    } else {
      return num.toFixed(2);
    }
  }

  function getCalculations() {
    let sipMessage = <></>;
    let extraAmountMessage = <></>;
    let pensionMessage = (
      <StyledResult>
        You will get pension of ₹{' '}
        <StyledAmount>{formatAmount(monthlyPensionRequired)} </StyledAmount> per
        month from age {retirementAge} for {pensionTenure} years.
      </StyledResult>
    );

    if (calculatedAmounts.sipAmount > 0) {
      sipMessage = (
        <StyledResult>
          To achieve this you will need Monthly SIP: ₹
          <StyledAmount>
            {formatAmount(calculatedAmounts.sipAmount.toFixed(2))}{' '}
          </StyledAmount>
        </StyledResult>
      );
    } else if (calculatedAmounts.extraAmountAtStartOfRetirement > 0) {
      extraAmountMessage = (
        <div>
          <StyledResult>
            You can withdraw ₹
            <StyledAmount>
              {formatAmount(
                calculatedAmounts.extraAmountAtStartOfRetirement.toFixed(2),
              )}
            </StyledAmount>{' '}
            at the start of your retirement. Or If you keep it invested, it will
            grow to ₹{' '}
            <StyledAmount>
              {formatAmount(
                calculatedAmounts.futuralValueOfExtraAmount.toFixed(2),
              )}{' '}
            </StyledAmount>
            at the end of your retirement.
          </StyledResult>
        </div>
      );
    }

    return (
      <div>
        {pensionMessage}
        {sipMessage}
        {extraAmountMessage}
      </div>
    );
  }

  const onCalculate = () => {
    setShowResults(true);
    calculateRetirementSavings();
    if (showResults && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <StyledFormContainer>
        <TextField
          label='Current Age'
          variant='outlined'
          value={currentAge}
          type='number'
          onChange={e => setCurrentAge(e.target.value)}
        />
        <TextField
          label='Retirement Age'
          variant='outlined'
          value={retirementAge}
          type='number'
          onChange={e => setRetirementAge(e.target.value)}
        />
        <TextField
          label='Monthly Pension Required'
          variant='outlined'
          value={monthlyPensionRequired}
          type='number'
          onChange={e => setMonthlyPensionRequired(e.target.value)}
        />

        <TextField
          label='Pension required for years'
          variant='outlined'
          value={pensionTenure}
          type='number'
          onChange={e => setPensionTenure(e.target.value)}
        />
        <TextField
          label='Expected annual returns %'
          variant='outlined'
          value={expectedReturns}
          type='number'
          onChange={e => setExpectedReturns(e.target.value)}
        />
        <TextField
          label='Existing investments (Lump Sum Amount)'
          variant='outlined'
          value={lumpSumAmount}
          type='number'
          onChange={e => setLumpSumAmount(e.target.value)}
        />

        <Button variant='contained' color='primary' onClick={onCalculate}>
          Calculate
        </Button>
      </StyledFormContainer>
      {showResults && (
        <StyledMessageContainer ref={resultRef}>
          {getCalculations()}
        </StyledMessageContainer>
      )}
    </>
  );
};

export default RetirementForm;
