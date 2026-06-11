import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';
import '@testing-library/jest-dom/extend-expect';
/* eslint-env jest */

test('renders Header, Home page with calculator list', () => {
  render(<App />);

  // Check if Header is rendered
  expect(screen.getByText('Financial Calculators')).toBeInTheDocument();

  // Check if the Retirement Planner card is rendered on the home page
  expect(screen.getByText('Retirement Planner')).toBeInTheDocument();
});
