# Changelog

All notable changes to Discipline OS are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Fixed

- Prevented successful empty Supabase REST responses from being parsed as JSON, which previously surfaced as `Unexpected end of JSON input` while saving or testing a phone notification subscription.

### Added

- Opt-in Home Screen Web Push reminders for supported mobile and desktop PWAs.
- Intelligent missing-check-in suppression so notifications stop immediately after any full or minimum daily check-in.
- Lock-screen deep links to the Today screen, service-worker notification handling, and app-icon badges.
- Per-device authenticated push subscriptions with Supabase row-level security and server-only VAPID delivery.
- Configurable primary and optional fallback reminder windows, plus a 90-minute anti-spam delivery guard.
- Context-aware reminder language for normal, travel, recovery, and return-after-a-gap states.
- A one-tap minimum check-in for exhausted or overloaded days, explicitly marked for optional later completion.
- A new Life OS Lite home screen built around a 30-second, three-signal daily check-in: money, body, and forward movement.
- Normal, travel, and recovery modes with mode-specific expectations instead of one rigid rule for every context.
- A travel budget panel that tracks the accepted trip budget, recorded spend, and remaining amount.
- A return flow that detects tracking gaps, explicitly removes backfill debt, and records recovery events.
- Weekly connection coverage and lightweight movement, focus, unplanned-spend, and return metrics.
- Backward-compatible migration from existing battle records and sports sessions into Lite check-ins while preserving every original record.
- Intentional progressive disclosure: the full battle, ledger, reward, sport, habit, and data-management systems remain one click away.
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
- Full-ledger search across dates, projects, accounts, amounts, types, notes, battle-sync sources, and recurring subscriptions.
- Selectable 10, 50, or 100-row ledger pagination with previous/next navigation and result counts.
- Visually elevated recurring and subscription entries so automatic deductions are immediately recognizable.
- Migration-safe account-effect markers so pre-fix ledger entries are applied exactly once and never incorrectly reversed.

### Changed

- Renamed and repositioned the PWA as Discipline OS Life in the install manifest.
- Upgraded the service-worker cache and added push, notification-click, direct-open, and badge behavior.
- Made Life OS Lite the default landing screen and moved the high-complexity feature navigation behind an explicit detail toggle.
- Replaced all-or-nothing daily pressure on the default screen with weekly coverage and minimum viable continuity.
- Paused the generation of new habit penalties by default; historical penalties remain visible and untouched.
- Made Lite check-ins local-first so a weak or missing connection cannot block today's record.
- Reframed travel spending as an accepted-budget decision instead of an automatic discipline loss.
- Renamed the former all-time savings figure to ledger net cash flow so it is not mistaken for current bank balances.
- Simplified the former asset/liability/net-worth dashboard into one signed account total and one reconciliation result.
- Strengthened cash-flow type selection with solid green income, red expense, and white credit-payment states; fixed ledger action-label overflow.

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
