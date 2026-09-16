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
