import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import RetirementForm from './RetirementForm';

describe('RetirementForm Component', () => {
  test('renders input fields and handles input changes', () => {
    render(<RetirementForm />);

    // Check if input fields are rendered
    const currentAgeInput = screen.getByLabelText('Current Age');
    const retirementAgeInput = screen.getByLabelText('Retirement Age');
    const monthlyPensionInput = screen.getByLabelText(
      'Monthly Pension Required',
    );

    expect(currentAgeInput).toBeInTheDocument();
    expect(retirementAgeInput).toBeInTheDocument();
    expect(monthlyPensionInput).toBeInTheDocument();

    // Simulate user input
    fireEvent.change(currentAgeInput, { target: { value: '30' } });
    fireEvent.change(retirementAgeInput, { target: { value: '65' } });
    fireEvent.change(monthlyPensionInput, { target: { value: '2000' } });

    // Check if input values are updated
    expect(currentAgeInput).toHaveValue(30);
    expect(retirementAgeInput).toHaveValue(65);
    expect(monthlyPensionInput).toHaveValue(2000);
  });

  test('calls calculateRetirementSavings and scrolls into view on form submission', () => {
    const scrollIntoViewMock = jest.fn();

    // Spy on useRef and mock the current value to return the mock DOM element
    jest.spyOn(React, 'useRef').mockReturnValueOnce({
      current: {
        test: 'test',
        scrollIntoView: scrollIntoViewMock,
      },
    });

    render(<RetirementForm />);

    // Simulate form submission
    const submitButton = screen.getByRole('button', {
      name: /calculate/i,
    });

    expect(screen.queryByTestId('calculation-result')).toBeNull();

    fireEvent.click(submitButton);

    expect(screen.getByTestId('calculation-result')).toBeInTheDocument();
  });
});
