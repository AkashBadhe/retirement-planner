# Financial Calculators

A collection of financial calculators built with React (frontend) and NestJS (backend API).

## Calculators

- **Retirement Planner** — Calculate monthly SIP needed for desired retirement pension
- **SIP Calculator** — Estimate returns on monthly SIP or lumpsum investments
- **CAGR Calculator** — Find compound annual growth rate or reverse-calculate future value
- **EMI Calculator** — Calculate monthly EMI, total interest, and payment breakup
- **SIP Returns (Stock/ETF)** — Backtest SIP returns on real stocks using Yahoo Finance data

## Project Structure

```
financial-calculators/
├── client/           # React frontend (CRA + MUI + TypeScript)
├── api/              # NestJS backend (Yahoo Finance proxy)
├── terraform/        # Azure infrastructure (App Service + Static Web App)
├── .github/          # CI/CD workflows
└── .kiro/            # AI context / steering
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm

### Install

```bash
# Frontend
cd client && pnpm install

# Backend
cd api && pnpm install
```

### Run locally

```bash
# Terminal 1 — API (runs on port 3000)
cd api && pnpm run start:dev

# Terminal 2 — Frontend (runs on port 3000, will prompt for 3001)
cd client && pnpm start
```

### Deploy

See [terraform/README.md](terraform/README.md) for Azure deployment instructions.

## Authors

Akash & Amruta
