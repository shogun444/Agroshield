# AgroShield

Full-stack demo for AgroShield, a trustless crop treatment marketplace with AI crop diagnosis.

## Stack

- Next.js App Router (TypeScript)
- Prisma ORM + Prisma Postgres
- Tailwind CSS
- Motion (animations)

## Getting Started

Install dependencies:

```
npm install
```

Generate Prisma client:

```
npx prisma generate
```

Run the dev server:

```
npm run dev
```

Open http://localhost:3000

## Environment Variables

Create a .env file in the repo root:

```
DATABASE_URL="postgresql://user:password@host:5432/db"
JWT_SECRET="your-secret"
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="gemma4:31b-cloud"
NEXT_PUBLIC_STELLAR_NETWORK="auto"
TRUSTLESS_WORK_BASE_URL_TESTNET="https://dev.api.trustlesswork.com"
TRUSTLESS_WORK_BASE_URL_MAINNET="https://your-mainnet-trustless-work-api"
TRUSTLESS_WORK_TRUSTLINE_ADDRESS_TESTNET="GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
TRUSTLESS_WORK_TRUSTLINE_ADDRESS_MAINNET="your-mainnet-trustline-address"
TRUSTLESS_WORK_TRUSTLINE_SYMBOL="USDC"
```

Notes:
- DATABASE_URL is required for Prisma.
- JWT_SECRET is required for auth tokens.
- OLLAMA_* are used by the diagnose endpoint (defaults are shown above).
- NEXT_PUBLIC_STELLAR_NETWORK controls which Freighter network the wallet connect flow accepts. Use `auto` to accept the active Freighter network, or set `mainnet`, `testnet`, `futurenet`, or `standalone`.
- Set the Trustless Work base URL and trustline address for each network you want to support. The current defaults keep testnet working; mainnet requires production values.

## Project Structure

```
app/
	api/
	diagnose/
	login/
	signup/
	layout.tsx
	page.tsx
	globals.css
components/
	Nav.tsx
	Hero.tsx
	Bento.tsx
	Section.tsx
	CTA.tsx
	Footer.tsx
	FeatureCard.tsx
lib/
	auth.ts
	gemini.ts
	prisma.ts
prisma/
	schema.prisma
	migrations/
```

## Features

- AI crop diagnosis with image upload
- Auth (register/login) with roles: Farmer and Vendor
- Prisma-backed persistence
- Landing page + auth + diagnose pages

## Notes

- The landing page uses Motion for section animations.
- Styling follows a warm, minimal, editorial aesthetic.
- Auth token is stored in localStorage by the login/signup pages.
