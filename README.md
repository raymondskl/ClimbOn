# ClimbOn

Local business control center. Manage finances, projects, leads, employees, and bring your own data for trends and forecasts.

## Stack

- Next.js 14 (App Router) + TypeScript
- SQLite via `better-sqlite3` (file-based, no server)
- Tailwind CSS
- Recharts

All data lives in `data/climbon.db` (git-ignored).

## Getting started

```bash
npm install
npm run db:init      # creates the SQLite file and seeds demo data
npm run dev          # http://localhost:3000
```

To start clean, delete `data/climbon.db` and run `npm run db:init` again (without demo data, skip the seed step by editing `scripts/init-db.mjs`).

## Modules

- **Dashboard** — overall snapshot: net cash, pipeline, active projects, follow-ups.
- **Finances** — log income/expenses, view monthly cash flow, category breakdowns.
- **Projects** — track status, budget, and per-project profitability (linked transactions).
- **Leads** — simple pipeline by stage, estimated value, next actions, win rate.
- **Employees** — roster, payroll footprint (annual + monthly).
- **Analytics** — built-in revenue/net forecast from your finances, plus CSV import for any other metric (traffic, conversions, unit sales…). Trend line uses linear regression; forecasts are 6-period linear projections.

## Forecasting notes

The forecasts use simple, transparent methods:

- Linear regression on historical monthly totals for a 6-month projection.
- Moving average for trend smoothing on imported datasets.
- R² shown alongside so you can judge how much to trust the trend.

These are direction-of-travel tools, not precise plans. If you import more data (or want seasonal/exponential models), that's a natural next step.
