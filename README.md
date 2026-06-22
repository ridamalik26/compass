# Compass — AI Financial Co-pilot

A full-stack money goals tracker with AI-powered recommendations.

## Features
- Goal onboarding (6-month, 1-year, 5-year goals)
- Live dashboard with progress tracking
- AI recommendations powered by Claude API
- Plaid sandbox bank integration
- Supabase backend with auth

## Tech Stack
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres + Auth)
- Anthropic Claude API
- Plaid SDK

## Setup
1. Clone the repo
2. Copy .env.local.example to .env.local and fill in keys
3. Run SQL migrations in /supabase/migrations/
4. npm install
5. npm run dev

## Environment Variables
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox
