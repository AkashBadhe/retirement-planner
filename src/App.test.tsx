import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';
import '@testing-library/jest-dom/extend-expect';
/* eslint-env jest */

test('renders Header, RetirementForm, and Footer components', () => {
  render(<App />);

  // Check if Header is rendered
  expect(
    screen.getByText('Retirement Planning Calculator'),
  ).toBeInTheDocument();
});
