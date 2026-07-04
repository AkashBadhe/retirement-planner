export interface Calculator {
  title: string;
  description: string;
  path: string;
  icon: string; // MUI icon name reference
}

const calculators: Calculator[] = [
  {
    title: 'Retirement Planner',
    description:
      'Calculate how much monthly SIP you need to achieve your desired retirement pension.',
    path: '/retirement-planner',
    icon: 'savings',
  },
  {
    title: 'SIP Calculator',
    description:
      'Calculate returns on your monthly SIP or lumpsum investment over time.',
    path: '/sip-calculator',
    icon: 'trending_up',
  },
  {
    title: 'CAGR Calculator',
    description:
      'Find the compound annual growth rate or calculate future value using reverse CAGR.',
    path: '/cagr-calculator',
    icon: 'show_chart',
  },
  {
    title: 'EMI Calculator',
    description:
      'Calculate your monthly EMI, total interest, and payment breakup for any loan.',
    path: '/emi-calculator',
    icon: 'account_balance',
  },
  {
    title: 'SIP Returns (Stock/ETF)',
    description:
      'Backtest SIP returns on any stock or ETF using real historical data from Yahoo Finance.',
    path: '/sip-returns',
    icon: 'history',
  },
  {
    title: 'SWP Calculator',
    description:
      'Calculate how long your investment lasts with systematic monthly withdrawals.',
    path: '/swp-calculator',
    icon: 'account_balance_wallet',
  },
  {
    title: 'Stock Intrinsic Value',
    description:
      'Calculate intrinsic value of a stock, find buy/exit levels, and get fundamental analysis.',
    path: '/stock-intrinsic-value',
    icon: 'analytics',
  },
  {
    title: 'Watchlist',
    description:
      'Track intrinsic value, upside, and quality across all your stocks in one table. Import from CSV.',
    path: '/watchlist',
    icon: 'list',
  },
];

export default calculators;
