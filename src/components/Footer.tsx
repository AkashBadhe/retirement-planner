// Footer.tsx
import React from 'react';
import styled from 'styled-components';

const StyledFooter = styled.footer`
  font-size: 16px;
  background: rgb(63, 201, 251);
  background: linear-gradient(
    180deg,
    rgba(63, 201, 251, 1) 0%,
    rgba(70, 204, 252, 1) 100%
  );
  padding: 1rem;
  color: white;
  text-align: center;
  position: fixed;
  left: 0;
  bottom: 0;
  width: 100%;
`;

const Footer = () => (
  <StyledFooter>
    © {new Date().getFullYear()} Retirement Planning Calculator. <br />
    Made with ❤️ by Akash & Amruta
  </StyledFooter>
);

export default Footer;
