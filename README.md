# Budget App

A collaborative budgeting application built with Next.js, Prisma, Mantine, and Zustand.

## Features

- **Collaborative Budgets**: Create and share budgets with team members via email invitations
- **Role-Based Access**: Owner, Editor, and Viewer roles with granular permissions
- **Budget Cycles**: Automatic cycle management (weekly, monthly, yearly, etc.)
- **Categories**: Organize spending with customizable categories and allocation methods
- **Expense Tracking**: Track expenses with splits across categories
- **Tags & Payees**: Organize and filter expenses
- **Dark Mode**: System-aware theme with manual override
- **PWA Support**: Installable on mobile and desktop

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Auth.js (NextAuth v5) with Email/Password and Google OAuth
- **UI**: Mantine v7
- **State Management**: Zustand (UI state only)
- **Icons**: Lucide React
- **Email**: Resend

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Google OAuth credentials (optional, for social login)
- Resend API key (for invitation emails)

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Copy the environment example and configure:

```bash
cp .env.example .env
```

3. Configure your `.env` file:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/budget_db"

# Auth.js
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_URL="http://localhost:3000"

# Google OAuth (optional)
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# Resend
RESEND_API_KEY="re_your_api_key"
EMAIL_FROM="Budget App <noreply@yourdomain.com>"
```

4. Generate Prisma client and push schema:

```bash
npm run db:generate
npm run db:push
```

5. Start the development server:

```bash
npm run dev
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Protected dashboard pages
│   └── invite/            # Invitation acceptance
├── components/            # React components
│   ├── budgets/          # Budget-related components
│   ├── categories/       # Category components
│   ├── expenses/         # Expense components
│   ├── invitations/      # Invitation components
│   └── layout/           # Layout components
├── lib/                   # Utilities and configuration
│   ├── auth.ts           # Auth.js configuration
│   ├── db.ts             # Prisma client
│   ├── cycles.ts         # Budget cycle calculations
│   ├── email.ts          # Email sending
│   └── format.ts         # Currency/date formatting
├── stores/               # Zustand stores (UI state only)
└── types/                # TypeScript type definitions
```

## Data Model

### Key Entities

- **User**: Account with email/OAuth authentication
- **Budget**: Container for categories, expenses, and members
- **BudgetMember**: User membership with role (Owner/Editor/Viewer)
- **Category**: Budget allocation with fixed amount, percentage, or remaining
- **Expense**: Transaction with amount, date, payee, and category splits
- **BudgetCycle**: Time period for tracking expenses (created on-demand)
- **Invitation**: Email invite with expiration and role assignment
- **Tag**: User-created labels for expense filtering
- **Payee**: Merchant/vendor for expenses

### Currency Handling

- All monetary values stored as integers in minor units (cents)
- Currency and locale stored per budget
- Formatted using `Intl.NumberFormat`

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
```

## Future Enhancements

- CSV import/export
- Receipt scanning (OCR)
- Push notifications
- Offline read-only support
- Budget templates/duplication

## License

MIT
