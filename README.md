# Giftr — An x402-Powered Local Gift Marketplace

No accounts. No credit cards. No payment forms. Just a wallet address and a payment that clears in under 500 milliseconds.

Giftr is a local gift-experience marketplace where AI agents browse and buy handcrafted goods, restaurant vouchers, spa treatments, and creative workshops — all priced and settled in USDC via Circle's infrastructure. 18 gifts from 6 Berlin-based providers: a craftsman selling olive-wood kitchenware, a trattoria offering dinner vouchers, a specialty coffee roaster, a stationery studio, a plant shop, and a spa.

---

## How Circle makes this possible

Three pieces of Circle infrastructure do the heavy lifting:

**1. Circle Agent Wallet** — a programmatic, non-custodial USDC wallet purpose-built for AI agents. Authenticates, holds balances, and authorizes payments without API keys, browser sessions, or manual signing.

**2. Circle Gateway (`GatewayWalletBatched`)** — the payment rail. When the buy endpoint is hit without payment, it returns `HTTP 402 Payment Required` with base64-encoded x402 payment details in the `PAYMENT-REQUIRED` header: seller address, exact amount in atomic USDC units, accepted chain (`eip155:5042002` = ARC-TESTNET), and the `GatewayWalletBatched` scheme. `@circle-fin/x402-batching` server middleware (`createGatewayMiddleware`) validates every incoming payment against the Gateway facilitator before the order is created.

**3. ARC-TESTNET** — USDC is the native gas token. No ETH, no MATIC, no separate gas token to pre-fund. One asset, zero friction.

The key unlock: **Circle's x402 protocol + Gateway batching means the marketplace never touches a private key, never manages user accounts, and never worries about chain-specific gas tokens. A GET request with a wallet address is the entire checkout flow.**

---

## Live Demo

**https://numeral-bootie-recognize.ngrok-free.dev**

| Page | Link |
|---|---|
| Provider Dashboard | https://numeral-bootie-recognize.ngrok-free.dev/provider |
| Admin Dashboard | https://numeral-bootie-recognize.ngrok-free.dev/admin |

Tokens: `dev-provider-token` / `dev-admin-token`.

---

## Quick Start

```bash
npm install
cp .env.example .env   # set SELLER_WALLET_ADDRESS and tokens
npm run dev            # Express :3000 + Vite :5173
```

Open http://localhost:5173.

---

## API

12 endpoints. Only `/api/orders/buy` touches money — `createGatewayMiddleware` validates the x402 payment against the Circle Gateway facilitator and only forwards the request once USDC has settled. Everything else is free metadata and lifecycle.

### Public catalog

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/catalog?q=&kind=&priceMax=&limit=` | Search gifts by keyword, kind, or price |
| `GET` | `/api/catalog/:id` | Single gift with provider info |

### Orders (x402-gated)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/orders/buy?productId=&buyerAddress=&message=&recipientName=` | Returns 402 with Gateway payment details until paid. On settlement, returns order with redemption token. |

### Order lookup

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/orders/lookup?token=` | Look up order by redemption token |
| `GET` | `/api/orders/:id` | Look up order by UUID |

### Fulfillment

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/orders/fulfill` | Mark order redeemed via `{ token }`. Idempotent. |

### Provider dashboard (token-gated)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/provider/providers` | List all providers |
| `GET` | `/api/provider/gifts?providerId=` | List provider's gift listings |
| `POST` | `/api/provider/gifts` | Create a new gift |
| `PATCH` | `/api/provider/gifts/:id` | Update price, description, or status |
| `DELETE` | `/api/provider/gifts/:id` | Deactivate a gift |

### Admin (token-gated)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/orders?status=` | List all orders |
| `POST` | `/api/admin/orders/:id/status` | Set order status to `open` or `fulfilled` |
| `POST` | `/api/admin/mock-order` | Create order without real payment (dev only) |

---

## Built for AI Agents

Every API response includes `_hint` fields and `X-Agent-Hint` headers directing the agent to ARC-TESTNET and Gateway batching:

```json
{
  "gifts": [...],
  "_hint": "Use ARC-TESTNET (eip155:5042002). Fund Circle Gateway wallet. Pay with GatewayClient.pay() batching. Demo MVP."
}
```

Agent flow: browse catalog, trigger 402, `GatewayClient.pay(url)` settles in under 500ms, receive order URL, share with recipient.

---

## x402 Payment Gate

1. **Pre-flight** — validates `productId` and `buyerAddress` (invalid returns 404/422 before any payment)
2. **Gate** — `gateway.require(price)` returns 402 with `PAYMENT-REQUIRED` header containing x402 v2, resource URL, 12 supported chains including `eip155:5042002` (ARC-TESTNET), USDC amount in base units (6 decimals), seller address, and `GatewayWalletBatched` settlement contract
3. **Settlement** — `GatewayClient.pay(url)` settles via Circle Gateway, `req.payment` is validated, order is created, URL is returned

```bash
curl -i 'http://localhost:3000/api/orders/buy?productId=gift_espresso_tonic&buyerAddress=0x...'
```

---

## Stack

| Layer | Tech |
|---|---|
| Runtime | Node.js 22+, TypeScript, ESM |
| Server | Express + `node:sqlite` |
| Payments | `@circle-fin/x402-batching` + GatewayWalletBatched |
| Chain | ARC-TESTNET (`eip155:5042002`) |
| Frontend | Vite + React 18 + Tailwind CSS v4 + React Router |

```
src/server/
  index.ts, db.ts, seed.ts (18 gifts x 6 providers)
  routes/  catalog | orders (x402) | provider | admin
src/web/   ProviderDashboard | AdminDashboard | OrderPage
scripts/   buy.ts (GatewayClient driver) | unpaid-curl.sh
```

---

## Auth

Provider and admin routes use `Bearer` token auth with `crypto.timingSafeEqual`. The order page (`/o/<token>`) is public — the 256-bit random token in the URL is the capability.

---

MIT