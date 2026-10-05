# Ads Merchants Asia - Project Knowledge & Agent Memory

This document is the single source of truth for all business logic, financial calculations, client requirements, and architectural rules for this platform. **NEVER violate these rules.**

---

## 1. Task Optimization Module ("Software ki Jaan")

### A. Sets & Progression Structure
- **1st Set**: 3 tasks (`0 / 3`, `1 / 3`, `2 / 3`, `3 / 3`)
- **2nd Set**: 2 tasks (`0 / 2`, `1 / 2`, `2 / 2`) — Reference screenshot: `All/WhatsApp Image 2026-09-07 at 07.10.33 (1).jpeg`
- **3rd Set**: 1 task (`0 / 1`, `1 / 1`) — Reference screenshot: `All/WhatsApp Image 2026-09-07 at 07.10.33.jpeg`
- Total daily standard cycle: 6 tasks (or custom admin limit).

### B. Balances & Financial Formulas
1. **Working Balance**:
   - Represents the user's active, operational balance.
   - When an order is grabbed/assigned, the order gross amount is deducted from Working Balance.
   - **Negative Working Balance (Deficit / Shortfall)**: As explained in Voice Note **V4**, if a user has $100 and a $2,000 order is assigned, Working Balance becomes **`-$1,900.00`**.
   - Deficit orders cannot be submitted until the shortfall is cleared via user deposit or admin balance top-up.

2. **Today's Profit**:
   - Displays accumulated commission profit earned from today's completed tasks.
   - **CRITICAL**: When working balance is negative, **Today's Profit MUST NOT be wiped to 0.00**. It retains the profits earned from previous completed tasks of the day (e.g. `USD 2,762.40` in screenshot `07.10.33 (1).jpeg`).

3. **Total Balance with Commission**:
   - When `Working Balance >= 0`: `Working Balance + Frozen Balance`.
   - When `Working Balance < 0`: `Frozen Balance + Today's Profit` (reflects total funds returning upon clearing deficit + commission).

4. **24-Hour Daily Reset Rule**:
   - Specified in Voice Note **T1**: Today's profit and task count ONLY reset after a full 24-hour cycle / calendar date change.
   - **DATE COMPARISON GOTCHA**: In MySQL, `DATE` columns return as JavaScript `Date` objects in Node.js. Comparing with `String(date).slice(0, 10)` results in `"Mon Sep 14"` vs `"2026-09-14"`, causing reset on every request! Always use `toDateString(val)` (`YYYY-MM-DD`).
   - **DEFICIT GUARD**: If `user.balance < 0` (user is currently in deficit), NEVER reset `today_tasks_completed`, `today_profit`, or `current_set` at midnight. The user must finish their active set/deficit.
   - **SELF-HEALING**: If `user.today_profit` is 0 in DB but completed tasks exist for today, dynamic fallback in `/api/tasks/status` and `/api/auth/me` calculates and heals the profit.

---

## 2. Records Page Module
- Tabs: **All**, **Pending**, **Completed**.
- **All**: Displays all orders (both pending and completed).
- **Pending**: ONLY displays incomplete orders (deficit or active orders awaiting submission). Must NOT contain completed orders.
- **Completed**: ONLY displays completed orders. Must NOT contain pending orders.
- Rendered into `#recordsContainer` in `record.html` via `record.js` without conflicting bridge re-renders.

---

## 3. KYC & Real-Time Performance
- KYC Image Uploads: Large camera captures (5MB+) must be compressed before sending to prevent server timeouts.
- Chat: Do not reload full history on every poll; optimize payload speed.

---

## 4. Audio Voice Notes & Client References Sitemap
- **`All/V4.ogg`**: Comprehensive explanation of Working Balance deductions, profit generation, and negative balance (-$1900 example).
- **`Requirements/R7.ogg`**: Graduated normal orders followed by admin deficit orders ("minus mein chala jaye account").
- **`Todays review/T1.ogg`**: 24-hour automatic reset of Today's Profit.
- **`Requirements/R1.ogg`**: Card display (Working Balance vs Total Balance with Commission).
- **`All/WhatsApp Image 2026-09-07 at 07.10.31.jpeg`**: Normal state reference UI (`1st Set: 0 / 3`).
- **`All/WhatsApp Image 2026-09-07 at 07.10.33 (1).jpeg`**: Deficit state reference UI (`2nd Set: 1 / 2`, `Working Balance -$3666.00`, `Today's Profit $2762.40`, `Total Balance with Commission $5068.20`).
- **`All/WhatsApp Image 2026-09-07 at 07.10.33.jpeg`**: Deficit state reference UI (`3rd Set: 0 / 1`, `Working Balance -$3479.00`, `Today's Profit $7171.20`, `Total Balance with Commission $13338.00`).

---

## 5. Client Confirmed Decision: Option A (Total Balance with Commission during Deficit)
- **Client Selected**: **Option A (Freeze Completed Funds)**.
- **Rule**: During a deficit order (e.g. 4th order of $50 when working balance is $20, resulting in -$30 working balance):
  - **Total Balance with Commission** displays the accumulated completed funds from previously completed orders ($108.00 in the example).
  - It remains frozen at $108.00 and does NOT wipe or jump to $168.00 during deficit.
  - Only when the user clears the deficit (e.g. deposits the $30 shortfall) and submits the order does the balance jump to $168.00 ($108 + $50 + $10 commission).
- **Status**: Confirmed & Implemented. Matches screenshot `07.10.33 (1).jpeg` ($5068.20) and `07.10.33.jpeg` ($13338.00).

---

## 6. Admin Panel Real-Time Audio Alerts & Ringing System
- When new administrative requests arrive in Control Center:
  - **Deposits**: New pending deposit request triggers audio chime + notification badge.
  - **Withdrawals**: New pending withdrawal request triggers audio chime + notification badge.
  - **KYC**: New pending KYC submission triggers audio chime.
  - **Live Chat (CRITICAL & RECURRING)**:
    - When any customer sends a chat message and it is unread / awaiting admin response:
    - **Recurring Ring Alert**: Ring message chime lasts **3 seconds** and repeats every **5 seconds** until an admin responds or opens the chat with that customer!
    - Visual indicator / pulse banner in the admin header.
- **Browser Audio Policy**: Must support user interaction unlock to ensure sound plays cleanly without browser autoplay restrictions.

---

## 7. Withdrawal Architecture & Strict Balance Segregation
- **Commission Balance Only**: Withdrawals are strictly deducted from `commission_balance` (Total Balance with Commission).
- **Working Balance Protected**: `user.balance` (Working Balance) is operational capital and is **strictly non-withdrawable**.
- **Pending Order Guard**:
  - A withdrawal cannot be initiated if any task or order is in progress (`ASSIGNED`, `PENDING`, `PROCESSING`, `SHORTFALL`), if working balance is negative, or if daily orders are incomplete.
  - Withdrawal modal dynamically alerts the user and displays `completed / maxTasks Completed` (e.g. `5 / 6 Completed`).
- **Payout Actions**:
  - `Approve (Paid External)`: Payout leaves the platform; funds are cleared from `frozen_balance`.
  - `Approve & Reinvest`: Payout funds are transferred directly into user's Working Balance (`user.balance`) and cleared from `frozen_balance`.
  - `Reject & Refund`: Funds are returned directly to `commission_balance` (Total Balance with Commission) and cleared from `frozen_balance`.
- **Badge Accuracy**: In the admin panel, withdrawals only receive the `Internal Reinvest` badge when their status is explicitly `reinvested`.

---

## 8. Contract System & Read-Only Working Balance Lock
- **Read-Only Lock**:
  - On `views/contract.html` and `portal-bridge.js`, the Investment Amount field is strictly locked (`readonly="readonly"`, `#f1f5f9` background, `cursor: not-allowed`).
  - Users cannot manually edit the investment amount.
- **Contract Funding Source**:
  - **First Contract**: Locked to the merchant's approved & verified deposit total.
  - **Second & Subsequent Contracts**: Automatically locked to the merchant's active **Working Balance** (`user.balance`).
- **Cycle Reset upon Contract Approval**:
  - When an administrator approves a contract in `approveKycAndReleaseVerifiedDeposits`, `today_tasks_completed` is set to 0 and `current_set` to 1 so the merchant can immediately start their next optimization cycle cleanly without false completion popups.

---

## 9. Admin Push Orders & Dynamic Counter Expansion
- **Dynamic Quota Formula**:
  - `maxTasks` dynamically expands: `Math.max(quota, completedTasks + totalIncompleteCount)`.
  - When a user has 5 completed orders and 1 pushed order is assigned/pending, counter shows **`5 / 6`**.
  - When user completes order 6 and admin pushes order 7, counter shows **`6 / 7`**.
  - Start button adapts set display dynamically: e.g. `3rd Set: 0 / 1` -> `3rd Set: 1 / 2` -> `3rd Set: 2 / 3`.
- **Order Priority Guard (Never Disappears)**:
  - In `POST /api/tasks/generate`, active incomplete orders in `orders` table (`ASSIGNED`, `PENDING`, `PROCESSING`, `SHORTFALL`) and pending tasks in `tasks` table **must be evaluated and returned FIRST**.
  - Never place the `effectiveCompleted >= maxTasks` daily completion check above pending task evaluation. Pushed orders must immediately launch in `showTaskModal` and never trigger the "Merchant Orders Completed / Activate Contract" popup.

---

## 10. Tech Stack & Critical Developer Gotchas
- **Tech Stack**: Node.js (v18/20), Express.js, MySQL 8 (`mysql2/promise`), `jsonwebtoken`, `bcryptjs`, Vanilla JS (`portal-bridge.js`, `admin.js`), SweetAlert2.
- **`workBalance` Definition**: Always declare `const workBalance = parseFloat(user.balance || 0);` before referencing it in `server/routes/finance.js`.
- **MySQL Date Formatting**: Always use `toDateString(val)` (`YYYY-MM-DD`) when checking calendar resets. Never use `String(date).slice(0, 10)` which parses JavaScript `Date` toString into `"Mon Sep 14"`.
- **Automated Tests**: Run test suite with `npm test`. All 62 tests must pass before deployment.
- **PM2 VPS Restart**: Restart production service via `pm2 restart server`.

