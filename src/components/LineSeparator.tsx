import React from 'react';
import styled from 'styled-components';
import { Typography } from '@mui/material';

// Styled component for the container
const SeparatorContainer = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
`;

// Styled component for the lines
const Line = styled.div`
  height: 1px;
  width: 100%;
  background-color: #ccc; // Adjust the line color as needed
`;

// Styled component for the Typography to adjust its style
const StyledTypography = styled(Typography)`
  padding: 0 10px;
  white-space: nowrap;
`;

// Component that renders the separator with "OR" in the middle
const LineSeparator = () => (
  <SeparatorContainer>
    <Line />
    <StyledTypography variant='h6'>OR</StyledTypography>
    <Line />
  </SeparatorContainer>
);

export default LineSeparator;
