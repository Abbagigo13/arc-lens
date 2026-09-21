# ArcLens

Network insights, USDC-native actions, and AI on **Arc** (Circle’s L1).

ArcLens is a live dashboard for the Arc chain (blocks, gas, chain health) with a Qwen-powered AI guide unlocked by a real **0.01 USDC** on-chain payment. Users can **send**, **swap**, and set up **recurring** USDC flows — including from chat — and always confirm in their own wallet.

Built for the ARC Microgrants track: product on Arc + USDC as payment.

---

## Features

- **Live network pulse** — block number, gas (paid in USDC), chain ID, activity
- **AI guide (Qwen)** — plain-English explanations; can use live dashboard context
- **USDC unlock paywall** — `unlock()` on ArcLensHub; unlock state read on-chain
- **Send USDC** — native transfers on Arc
- **Mini swap** — native USDC → synthetic EURC credit (1:1), with redeem
- **Recurring buy** — create plan, pull on interval, cancel with refund
- **Chat actions** — e.g. `swap 0.01 USDC`, `send 0.01 to me`, `recurring 0.01 every 60`
- **Landing** — animated 3D hero, feature grid, how-it-works

---

## Networks

| | Testnet | Mainnet |
| -- | --------- | --------- |
| Chain ID | `5042002` | `5042` |
| RPC | `https://rpc.testnet.arc.network` | `https://rpc.mainnet.arc.io` |
| Explorer | <https://explorer.testnet.arc.io> | <https://explorer.arc.io> |

Switch app network in `src/lib/arc.ts`:

```ts
export const DEFAULT_ARC = ARC_MAINNET; // or ARC_TESTNET

Mainnet contract
ArcLensHub (unlock + swap/redeem + recurring in one contract):
0xFb430BbC236b2FAcDB11c81d79eE551DFad14AF7
Explorer: https://explorer.arc.io/address/0xFb430BbC236b2FAcDB11c81d79eE551DFad14AF7
Addresses are configured in:

.src/lib/unlocker.ts — unlock
.src/lib/contracts.ts — swap / recurring (same hub address)

Stack

Next.js (App Router), TypeScript, Tailwind CSS
Framer Motion, React Three Fiber (landing)
Multi-wallet connect + Arc chain switch
Qwen via DashScope (qwen-plus)
Arc L1 — native USDC (18 decimals)

Setup

npm install

Create .env.local:
DASHSCOPE_API_KEY=your_dashscope_api_key

npm run dev

Open http://localhost:3000 → Launch dashboard.
Wallet
Add Arc in OKX or MetaMask (chain ID 5042 mainnet or 5042002 testnet). Use matching RPC/explorer from the table above. Symbol: USDC.

Chat actions (after unlock)
Message,Result
swap 0.01 USDC,Confirm card → swap
send 0.01 to me,Confirm card → send to your address
send 0.01 to 0x…,Confirm card → send to address
recurring 0.01 every 60,Confirm card → create plan
Questions about Arc / metrics,Qwen answer

Nothing is signed until you confirm in the wallet.

Project structure
src/
  app/page.tsx                 # Landing
  app/dashboard/page.tsx       # Dashboard
  app/api/ai/chat/route.ts     # AI API route
  components/dashboard/        # Stats, AI, send, swap, recurring
  components/landing/          # Hero, features, 3D
  hooks/useWallet.ts           # Wallet + txs
  lib/arc.ts                   # Chain config
  lib/unlocker.ts              # Unlock helpers
  lib/contracts.ts             # Hub address + selectors

  Deploy frontend

 1.Push to GitHub
 2.Deploy on Vercel (or similar)
 3.Set DASHSCOPE_API_KEY in project env
 4.Ensure DEFAULT_ARC and hub address match mainnet

 Safety

.Mainnet uses real USDC. Prefer 0.01 for tests.
.The AI never signs; you always confirm in the wallet.
.Synthetic EURC credit is internal accounting unless redeemed 1:1 via the hub.
.Contract was reviewed in Arc Studio (High/Medium issues fixed before deploy). Not a formal third-party audit for large funds.
.Not financial advice.

Links

Arc: https://arc.network
Docs: https://docs.arc.io
Studio: https://studio.arc.io
Hub: https://arc-lens-alpha.vercel.app/
