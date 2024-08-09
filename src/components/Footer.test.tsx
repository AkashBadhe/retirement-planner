// Footer.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import Footer from './Footer';

describe('Footer Component', () => {
  test('renders the footer with correct content', () => {
    render(<Footer />);

    // Check if the footer contains the current year
    const currentYear = new Date().getFullYear();
    const notice = new RegExp(
      `© ${currentYear} Retirement Planning Calculator.`,
    );
    expect(screen.getByText(notice)).toBeInTheDocument();

    // Check if the footer contains the text "Made with ❤️ by Akash & Amruta"
    expect(
      screen.getByText(/Made with ❤️ by Akash & Amruta/i),
    ).toBeInTheDocument();
  });
});
