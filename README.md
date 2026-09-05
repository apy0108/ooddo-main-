# PeoplePay360 — HR & Payroll Platform

Full-stack HR & Payroll management system built with React, Express, Prisma, and PostgreSQL.

## Structure

```
peoplepay360/
  client/    ← React + Vite + Tailwind (port 5173)
  server/    ← Express + Prisma + PostgreSQL (port 5000)
```

## Getting Started

### Backend
```bash
cd server
cp .env.example .env   # fill in your values
npm install
npx prisma migrate dev
node prisma/seed.js
npm run dev
```

### Frontend
```bash
cd client
npm install
npm run dev
```

## Default Credentials (after seed)
| Email | Role | Password |
|---|---|---|
| admin@peoplepay360.com | ADMIN | Password@123 |
| hr.manager@company.com | HR_MANAGER | Password@123 |
| payroll.mgr@company.com | HR_PAYROLL_MANAGER | Password@123 |
| payroll.user@company.com | HR_PAYROLL_USER | Password@123 |
| john.doe@company.com | EMPLOYEE | Password@123 |
