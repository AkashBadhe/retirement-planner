// Header.tsx
import React from 'react';
import styled from 'styled-components';

const StyledHeader = styled.div`
  font-size: 24px;
  background: rgb(63, 201, 251);
  background: radial-gradient(
    circle,
    rgba(63, 201, 251, 1) 0%,
    rgba(70, 204, 252, 1) 100%
  );
  padding: 1rem;
  color: white;
`;

const Header = () => (
  <StyledHeader>Retirement Planning Calculator</StyledHeader>
);

export default Header;
