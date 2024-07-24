# Retirement Planning Tool

This project is a retirement planning tool built using React.js. It aims to help individuals plan and visualize their retirement savings and investment strategies.

## Features

- Interactive user interface for inputting financial data such as current savings, expected retirement age, and desired retirement income.
- Calculation of retirement savings goal based on user inputs and various financial factors.
- Visualization of retirement savings progress through charts and graphs.
- Ability to adjust variables such as investment returns and inflation rates to see the impact on retirement savings.
- Personalized recommendations and tips for optimizing retirement savings based on individual circumstances.

## Technologies Used

- React.js for building the user interface and managing state.
- Chart.js for visualizing retirement savings data.
- HTML and CSS for styling and layout.
- JavaScript for implementing calculations and logic.

## Getting Started

To get started with the retirement planning tool, follow these steps:

1. Clone the repository: `git remote add origin https://github.com/AkashBadhe/retirement-planner.git`
2. Install dependencies: `pnpm install`
3. Start the development server: `pnpm start`
4. Open your browser and navigate to `http://localhost:3000`

## Contributing

Contributions are welcome! If you have any ideas, suggestions, or bug reports, please open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.

## Calculations

# Retirement Savings Calculation

This document outlines the step-by-step process for calculating the required savings for retirement, considering both Systematic Investment Plan (SIP) contributions and a lump sum investment.

## Steps for Calculation

### 1. Calculate the Future Value of the SIP investments (FVSIP)

- **Formula:** `FVSIP = P * [((1 + r)^n - 1) / r] * (1 + r)`
- **Where:**
  - `P` is the SIP amount (what we want to find),
  - `r` is the monthly return rate (expected returns % / 12 / 100),
  - `n` is the total number of SIP payments (SIP period in years * 12).

### 2. Calculate the Future Value of the Lump Sum investment (FVLumpSum)

- **Formula:** `FVLumpSum = P * (1 + r)^n`
- **Where:**
  - `P` is the lump sum amount already invested,
  - `r` is the monthly return rate,
  - `n` is the total number of months till retirement.

### 3. Calculate the Total Future Value needed (FVTotal)

- **Formula:** `FVTotal = Monthly Pension Requirement * [((1 + r)^n - 1) / r] / (1 + r)`
- **Where:**
  - Monthly Pension Requirement is the monthly pension required,
  - `r` is the monthly return rate during the withdrawal period,
  - `n` is the total number of months of pension tenure (withdrawal period in years * 12).

### 4. Solve for the SIP amount (P) required to meet the FVTotal, considering FVLumpSum

This step involves solving the equation for `P` (the SIP amount) using the formulas provided above, to ensure the total future value needed for retirement is met, taking into account the future value of the lump sum investment.
