# ZeroXLM — Sponsored Reserve Onboarding Kit

## Idea
- **Track:** Financial Inclusion
- **Idea #:** 31 (from the 300-ideas list)
- **One-liner:** A drop-in kit that lets businesses sponsor the base reserve for new Stellar accounts, enabling zero-balance onboarding.

## Problem
New Stellar users need XLM just to exist on the network (base reserve ~1 XLM). This blocks zero-balance onboarding — you can't create an account without first having XLM. For businesses onboarding thousands of users in emerging markets (e.g., remittance apps in the Philippines), asking each user to source XLM upfront is a major friction point.

## How it uses Stellar
**Core Stellar feature: Sponsored Reserves (CAP-0033).** Uses the native `BeginSponsoringFutureReserves` / `CreateAccount` / `EndSponsoringFutureReserves` transaction pattern — no Soroban contract needed. The sponsor (business) pays the 1 XLM reserve, and the new user gets a fully functional account at zero cost.

## What works in the demo
- [x] Sponsor connects Freighter wallet (testnet)
- [x] Sponsor funds with Friendbot
- [x] Sponsor enters a new user's public key and creates their account with sponsored reserve
- [x] Self-service mode: generate a new Stellar keypair and get the public key to give to a sponsor
- [x] View sponsored accounts and stats
- [ ] Full onboarding flow with trustline sponsorship
- [ ] Transaction history for sponsored accounts

## Setup / run
- Network: **testnet**
- `cd web && npm run dev`
- Open http://localhost:3000
- Switch Freighter to Test Net

## Demo
- (Add video link)
- (Add repo link)

## Submission checklist
- [ ] Public GitHub repo with a license
- [ ] README explains problem, Stellar usage, and setup
- [ ] Demo video (2–4 min)
- [ ] Submitted via the workshop's official GitHub issue template
