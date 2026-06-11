import React, { useState } from 'react';
import { Slider, TextField, Typography, InputAdornment } from '@mui/material';
import styled from 'styled-components';

const SliderRow = styled.div`
  margin-bottom: 1.5rem;
`;

const LabelRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const StyledTextField = styled(TextField)`
  max-width: 180px;

  .MuiOutlinedInput-root {
    background-color: #e8f5e9;
    border-radius: 6px;
  }

  .MuiOutlinedInput-input {
    padding: 8px 12px;
    font-weight: 600;
    color: #2e7d5b;
    text-align: right;
  }
`;

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  formatDisplay?: (value: number) => string;
}

const SliderInput: React.FC<SliderInputProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  prefix,
  suffix,
  formatDisplay,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleSliderChange = (_: Event, newValue: number | number[]) => {
    onChange(newValue as number);
  };

  const handleFocus = () => {
    setIsFocused(true);
    setInputValue(value.toString());
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(inputValue.replace(/,/g, ''));
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    const parsed = parseFloat(e.target.value.replace(/,/g, ''));
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const displayValue = isFocused
    ? inputValue
    : formatDisplay
      ? formatDisplay(value)
      : value.toString();

  return (
    <SliderRow>
      <LabelRow>
        <Typography variant='body1' fontWeight={500}>
          {label}
        </Typography>
        <StyledTextField
          variant='outlined'
          size='small'
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          InputProps={{
            startAdornment: prefix ? (
              <InputAdornment position='start'>
                <Typography fontWeight={600} color='#2e7d5b'>
                  {prefix}
                </Typography>
              </InputAdornment>
            ) : undefined,
            endAdornment: suffix ? (
              <InputAdornment position='end'>
                <Typography fontWeight={600} color='#2e7d5b'>
                  {suffix}
                </Typography>
              </InputAdornment>
            ) : undefined,
          }}
        />
      </LabelRow>
      <Slider
        value={value}
        onChange={handleSliderChange}
        min={min}
        max={max}
        step={step}
        sx={{
          color: '#1a3a5c',
          '& .MuiSlider-thumb': {
            backgroundColor: '#fff',
            border: '2px solid #1a3a5c',
            width: 20,
            height: 20,
          },
          '& .MuiSlider-track': {
            height: 4,
          },
          '& .MuiSlider-rail': {
            height: 4,
            color: '#dce3e8',
          },
        }}
      />
    </SliderRow>
  );
};

export default SliderInput;
