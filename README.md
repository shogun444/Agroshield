# 🌿 AgroShield

**AgroShield** is a trustless crop treatment marketplace connecting farmers with local agronomists. It features AI-powered crop diagnosis, and an escrow system built on the **Stellar Testnet** (using Trustless Work) to ensure funds are only released when treatment is confirmed delivered.

![AgroShield Stack](https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js)
![Prisma](https://img.shields.io/badge/Prisma-ORM-blue?style=flat&logo=prisma)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css)
![Stellar](https://img.shields.io/badge/Stellar-Testnet-black?style=flat&logo=stellar)

---

## ✨ Features

- **AI Crop Diagnosis**: Farmers upload photos of sick crops. Our AI instantly identifies the disease and recommends treatments.
- **Vendor Marketplace**: Agronomists and pesticide vendors bid on cases locally.
- **Trustless Escrow**: Built on the Stellar Testnet. Payments are held in a smart contract and released only upon successful treatment confirmation.
- **Dispute Resolution**: Built-in flow to mediate issues without unfair losses.
- **Role-based Dashboards**: Separate views and flows for Farmers and Vendors.

---

## 🚀 Getting Started

Follow these instructions to clone, set up, and run AgroShield on your local machine.

### 1. Prerequisites
Ensure you have the following installed:
- **Node.js** (v18+)
- **npm** or **yarn**
- **PostgreSQL** database (Local or Cloud, e.g., Supabase/Neon)
- **Freighter Wallet Extension** (For Stellar Testnet transactions in the browser)
- **Ollama** (Local AI instance, optional but recommended for testing diagnosis)

### 2. Clone the Repository

```bash
git clone https://github.com/shogun444/Agroshield.git
cd Agroshield
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Environment Variables

Copy the provided example or create a new `.env` file in the root directory:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/agroshield?schema=public"

# Authentication (Generate a random string for this)
JWT_SECRET="your-super-secret-jwt-key"

# AI Diagnosis (Ollama - Local)
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="gemma4:31b-cloud"

# AI Diagnosis (Gemini - Cloud Fallback)
GEMINI_API_KEY="your-gemini-api-key"

# Stellar Network Config
NEXT_PUBLIC_STELLAR_NETWORK="testnet"
```

### 5. Database Setup

AgroShield uses Prisma ORM. First, push the schema to your database to create the necessary tables, then generate the client.

```bash
# Push the schema to your database
npx prisma db push

# Generate the Prisma Client
npx prisma generate
```

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 💳 Testing the Escrow Flow

AgroShield uses real on-chain transactions on the **Stellar Testnet** for demo purposes. To test the complete flow:

1. Install the **Freighter** wallet extension in your browser.
2. In Freighter settings, switch your network to **Testnet**.
3. Create an account and fund it using the [Stellar Laboratory Testnet Faucet](https://laboratory.stellar.org/#account-creator?network=testnet).
4. You will need **Testnet USDC** and a small amount of **XLM** (for gas/fees) to accept bids and sign transactions.
5. In the app, when you accept a bid as a farmer, Freighter will pop up to sign the escrow creation transaction.

---

## 📂 Project Structure

- `app/` — Next.js App Router (Pages, API routes, Layouts)
  - `api/` — Backend logic (Auth, Cases, Disputes, Escrow, AI)
  - `farmer/` & `vendor/` — Role-specific dashboards
- `components/` — Reusable React components (UI elements, Layout, Vendor cards)
- `lib/` — Utility functions (Prisma client, Gemini/Ollama wrappers, WalletKit integration)
- `prisma/` — Prisma schema (`schema.prisma`) and migrations

---

## 🎨 Design System

AgroShield uses a premium, warm, minimal editorial aesthetic:
- **Fonts**: `Manrope` for headings (bold, punchy), `Inter` for body copy.
- **Colors**: Off-white/Beige backgrounds (`#F5F0EB`, `#f8f5f2`), crisp dark grays (`#171717`), and distinct functional accents (Emerald Green for success/trust, Red for high-risk warnings).
- **Animations**: Powered by `motion/react` for smooth section reveals and accordion transitions.

---

## 🛠 Scripts

- `npm run dev`: Starts the local development server.
- `npm run build`: Creates an optimized production build.
- `npx tsx scripts/cleanup-escrows.ts`: Cleans up mock/demo escrows from the database to reset your testing state.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
