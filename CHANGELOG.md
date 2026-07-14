# Changelog

All notable changes to Discipline OS are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Asset-account tracking for banks, e-wallets, investments, cash, and other holdings.
- Custom account images, exact balances, allocation percentages, and last-updated timestamps.
- Actual total assets separated from ledger net cash flow.
- Reconciliation difference with a clear RM0 fully-aligned state.
- Optional account assignment for every savings-ledger entry.
- Per-status transaction counts and total spending amounts in the battle-expense synchronization center.
- Automatic account-balance updates when ledger entries are created, edited, deleted, approved, declined, or re-synced.
- Account selection for recurring income, bills, and subscriptions, with automatic balance effects when entries materialize.
- User-controlled credit-card designation on any account, with signed negative balances that deduct directly from the account total.
- Reversible account-to-account transfers with source, destination, date, amount, and notes preserved in transfer history.
- Credit-card repayment inside the cash-flow form, deducting the chosen funding account and reducing card debt without double-counting an expense.
- Migration-safe account-effect markers so pre-fix ledger entries are applied exactly once and never incorrectly reversed.

### Changed

- Renamed the former all-time savings figure to ledger net cash flow so it is not mistaken for current bank balances.
- Simplified the former asset/liability/net-worth dashboard into one signed account total and one reconciliation result.

## [1.0.0] - 2026-07-14

### Added

- Daily RM0 battle dashboard and streak progression.
- Multi-transaction daily spending with past-date backfills.
- Battle history filters, transaction analytics, and item-level AI reviews.
- Reward vault, expanding mystery drops, earned reward archive, and AI reward advisor.
- Impulse capture and resisted-purchase tracking.
- Sports session logging, exercise library, skill progression, and technique review.
- Habit tracking, grace passes, recovery, rewards, penalties, and AI assessment.
- Independent savings ledger with recurring cash flow, forecasts, targets, and AI insights.
- Reversible battle-expense synchronization center with pending, approved, and declined lists.
- Supabase authentication and cross-device state synchronization.
- Bilingual interface, customizable themes, and installable PWA support.

### Changed

- Earned mystery-drop rewards now require a concrete item before AI assessment.
- AI evaluates in-budget earned rewards by their actual usefulness instead of treating them as ordinary impulse spending.
- Battle records now support unlimited itemized expenses per day without overwriting previous transactions.

### Deployed

- Production application: https://discipline-os-beige.vercel.app
