# Ads Merchants Asia - Complete Technical & Requirements Documentation

**Single Source of Truth, System Blueprint, Architecture & Developer Reference**

---

## 1. Executive Summary & Core Platform Philosophy

**Ads Merchants Asia** is a full-stack, enterprise-grade e-commerce order optimization and merchant commission platform. The application provides merchants with automated order processing cycles, graduated commission rewards, verified KYC contracts, ledger-backed financial tracking, and an administrative control center.

### Core Business Objectives:
1. **Merchant Order Optimization ("Software ki Jaan")**: Users complete structured daily sets of merchant tasks (standard: Set 1 = 3 tasks, Set 2 = 2 tasks, Set 3 = 1 task, total 6 tasks).
2. **Dual-Balance Segregation**:
   - **Working Balance (`user.balance`)**: Operational trading principal used to fund merchant orders. **Strictly non-withdrawable**.
   - **Total Balance with Commission (`user.commission_balance`)**: Accumulated completed order funds and earned commission profit. **Exclusively withdrawable**.
3. **Deficit / Shortfall Mechanism**: Administrators can assign graduated or high-value orders that exceed the user's working balance, pushing the working balance into a negative deficit (e.g. `$100 - $2,000 = -$1,900.00`). Deficit orders remain locked until the shortfall is cleared via verified deposit.
4. **Verifiable Contract System**: Merchants must sign formal contracts:
   - **First Contract**: Verified against initial deposit proof.
   - **Second & Subsequent Contracts**: Automatically locked to the merchant's active Working Balance (strictly non-editable).
5. **Real-Time Admin Alerting**: Instant chime notifications for pending deposits, withdrawals, and KYC, plus a recurring 3-second alert every 5 seconds for unread customer chat messages.

---

## 2. Technology Stack & Frameworks

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Backend Runtime** | Node.js (v18.x / v20.x LTS) | Event-driven server runtime |
| **Web Framework** | Express.js 4.19+ | REST API server with middleware architecture |
| **Multi-Domain / Subdomain** | `vhost` ^3.0.2 | Virtual host routing for admin portal (`admin.domain.com`) and main portal |
| **Database** | MySQL 8.x / MariaDB | Relational database accessed via `mysql2/promise` connection pool |
| **Authentication & Tokens** | `jsonwebtoken` ^9.0.2 & `cookie-parser` | Stateless JWT stored in `httpOnly` secure cookies |
| **Password Security** | `bcryptjs` ^2.4.3 | Salted hashing for merchant and administrator credentials |
| **File / Media Uploads** | `multer` ^1.4.5-lts.1 | Multipart upload handling for receipts, KYC IDs, signatures, and chat attachments |
| **Geo-Location** | `geoip-lite` ^1.4.10 | IP lookup for administrator audit logs and user session telemetry |
| **Frontend Architecture** | Vanilla JavaScript (ES6+), HTML5, CSS3 | High-performance, zero-framework architecture with `portal-bridge.js` & `admin.js` |
| **UI Components & Modals** | SweetAlert2 (`Swal`) & Custom CSS | Responsive modal dialogs, status badges, and notifications |
| **Testing Suite** | Node.js Test Runner (`node --test`) | Built-in zero-dependency unit and integration testing suite |

---

## 3. Directory Structure & Architecture

```
amazon-asia-merchants-main/
├── server.js                      # Main entrypoint: Express app, vhost configuration, static serving
├── package.json                   # Dependencies, test scripts, and project metadata
├── AGENTS.md                      # Agent permanent memory and business logic rules
├── PROJECT_DOCUMENTATION.md       # Complete requirements and system technical blueprint
├── .env.example                   # Environment variable template
│
├── server/
│   ├── db.js                      # MySQL connection pool, automatic schema migrations & ORM helpers
│   ├── schema.sql                 # Primary database table definitions and indices
│   │
│   ├── middleware/
│   │   └── auth.js                # JWT verification, session hydration, and RBAC authorization
│   │
│   ├── routes/
│   │   ├── admin.js               # Admin APIs: user control, order push, deposits/withdrawals, KYC, settings
│   │   ├── auth.js                # Public APIs: login, registration, logout, session verification
│   │   ├── finance.js             # Financial APIs: deposit submission, crypto/fiat withdrawal, transaction history
│   │   ├── tasks.js               # Task Optimization Engine: status, generate, submit, order cancellation, records
│   │   └── user.js                # User profile, KYC contracts, live chat endpoints, notifications
│   │
│   └── utils/                     # Business logic utilities and test suites
│       ├── assignmentNotifications.test.js
│       ├── chatUpload.test.js
│       ├── contractFunding.js & .test.js
│       ├── depositAmount.test.js
│       ├── depositContractMatch.test.js
│       ├── depositNotifications.test.js
│       ├── investmentAmount.test.js
│       ├── logout.test.js
│       ├── orderCompletion.test.js
│       ├── orderTaskLink.js & .test.js
│       ├── productCategories.test.js
│       ├── startCarousel.test.js
│       ├── taskFunding.test.js
│       ├── taskProductSelection.test.js
│       └── withdrawalAmount.test.js
│
├── client/
│   └── assets/
│       ├── css/                   # Stylesheets: index, home, start, record, deposit, withdraw, admin
│       ├── js/
│       │   ├── portal-bridge.js   # Main user frontend controller (data binding, modals, API calls)
│       │   ├── admin.js           # Admin portal controller (charts, queues, actions, live chat, ringing)
│       │   └── record.js          # Records page tab controller (All, Pending, Completed)
│       ├── img/                   # Icons, VIP badges, banners, logos
│       └── audio/                 # Alert audio files (chime.mp3, ring.mp3)
│
├── views/                         # Server-rendered HTML templates
│   ├── index.html                 # Landing / portal view
│   ├── dashboard.html             # User overview dashboard
│   ├── start.html                 # Optimization Engine: rotating product carousel, start button, sets
│   ├── record.html                # Task transaction ledger (All / Pending / Completed tabs)
│   ├── contract.html              # KYC merchant verification and contract signing
│   ├── deposit.html               # TRC20/ERC20/BTC crypto and fiat deposit gateway
│   ├── withdraw.html              # Payout request portal (Crypto & Bank transfer)
│   ├── profile.html               # User account summary, balances, VIP status
│   ├── editprofile.html           # Profile details editor
│   ├── admin.html                 # Administrative Control Center & Live Operation Room
│   ├── login.html                 # Authentication login screen
│   ├── register.html              # Merchant registration screen
│   └── forgotpass.html            # Password recovery screen
│
└── assets/uploads/                # Uploaded media (KYC proofs, signatures, deposit slips, chat media)
```

---

## 4. Financial Calculations & Balances Blueprint

The platform employs a dual-balance ledger model. Every transaction is recorded in `ledger_transactions`.

### A. Balance Definitions

| Balance Type | Database Column | Description | Withdrawable? |
| :--- | :--- | :--- | :--- |
| **Working Balance** | `users.balance` | Active operational trading capital. Order prices are deducted from this balance. | **NO** |
| **Total Balance with Commission** | `users.commission_balance` | Accumulated funds from completed orders (principal + commission). | **YES (Strictly)** |
| **Frozen Balance** | `users.frozen_balance` | Funds locked in pending withdrawal requests or shortfall reserves. | **NO (Locked)** |
| **Today's Profit** | `users.today_profit` | Accumulated commission profit earned today. | Display metric |

### B. Financial Rules & Formulas

1. **Working Balance Deduction**:
   - When a task is generated/submitted, `order.gross_amount` is deducted from Working Balance:
     $$\text{Working Balance}_{\text{after}} = \text{Working Balance}_{\text{before}} - \text{Order Gross Amount}$$

2. **Negative Working Balance (Shortfall / Deficit)**:
   - If user has $\$100.00$ and a $\$2,000.00$ order is assigned:
     $$\text{Working Balance} = 100.00 - 2,000.00 = -\$1,900.00$$
   - The user has a shortfall of $\$1,900.00$. The deficit order cannot be submitted until the merchant deposits $\$1,900.00$ (or admin credits balance).

3. **Total Balance with Commission (Client Confirmed Option A)**:
   - **Normal State (`Working Balance >= 0`)**: Reflects accumulated completed capital available for withdrawal:
     $$\text{Withdrawable Funds} = \text{commission\_balance}$$
   - **Deficit State (`Working Balance < 0`)**:
     $$\text{Total Balance with Commission} = \text{Frozen Completed Funds}$$
     - Completed funds earned prior to the deficit remain **frozen and protected**. They do not wipe to zero, nor do they prematurely jump before the deficit is paid.
     - Once the shortfall is cleared and the deficit order completes, the order principal plus reward are released into `commission_balance`.

4. **Today's Profit Integrity**:
   - When a user enters a deficit, **`today_profit` MUST NOT be wiped to 0.00**. It retains accumulated profits earned from earlier completed orders of the day.

5. **Withdrawal Payout Rule**:
   - Withdrawals are **strictly deducted from `commission_balance`**.
   - Working Balance is never touched for withdrawals:
     $$\text{commission\_balance}_{\text{new}} = \text{commission\_balance}_{\text{old}} - \text{Withdrawal Amount}$$
     $$\text{frozen\_balance}_{\text{new}} = \text{frozen\_balance}_{\text{old}} + \text{Withdrawal Amount}$$

---

## 5. Task Optimization Module ("Software ki Jaan")

### A. Sets & Progression Structure
- **1st Set**: 3 tasks (`0 / 3`, `1 / 3`, `2 / 3`, `3 / 3`)
- **2nd Set**: 2 tasks (`0 / 2`, `1 / 2`, `2 / 2`)
- **3rd Set**: 1+ tasks (`0 / 1`, `1 / 1` or dynamic push expansion)
- Total daily standard cycle: 6 tasks (unless admin sets a custom quota).

### B. Dynamic Quota & Push Order Counter Expansion
When an administrator pushes an extra order to a user (e.g. order #6 or #7):
1. **Dynamic Target Formula**:
   $$\text{maxTasks} = \max(\text{daily\_limit}, \text{completedTasks} + \text{activeIncompleteOrders})$$
   - If user has completed 5 orders and admin pushes 1 order:
     $$\text{Counter} = \mathbf{5 / 6}$$
   - If user completes order 6 and admin pushes order 7:
     $$\text{Counter} = \mathbf{6 / 7}$$
   - If user completes order 7 and admin pushes order 8:
     $$\text{Counter} = \mathbf{7 / 8}$$
2. **Circular Start Button**:
   - Automatically adapts set display:
     - 5 completed + 6th pending: `3rd Set: 0 / 1`
     - 6 completed + 7th pending: `3rd Set: 1 / 2`
     - 7 completed + 8th pending: `3rd Set: 2 / 3`
3. **Pushed Order Priority (Never Disappears)**:
   - In `/api/tasks/generate`, checking for active pending tasks and incomplete orders in the `orders` table occurs **BEFORE** the daily completion check.
   - Pushed orders are immediately returned to the merchant modal (`showTaskModal`), preventing false triggers of the "Merchant Orders Completed / Activate Contract" popup.

### C. 24-Hour Daily Reset & Self-Healing Engine
1. **Date Comparison Rule**:
   - In MySQL, `DATE` columns return as JavaScript `Date` objects in Node.js. Comparing via `String(date).slice(0, 10)` causes `"Mon Sep 14"` vs `"2026-09-14"`, wiping stats prematurely on every request.
   - **Always use `toDateString(date)` (`YYYY-MM-DD`)**.
2. **Deficit Reset Guard**:
   - If `user.balance < 0` at midnight, `today_tasks_completed`, `today_profit`, and active orders **MUST NEVER be reset**. The user must finish their active set and deficit.
3. **Self-Healing Fallback**:
   - If `today_profit` is 0 in the database but completed tasks exist for the current calendar date after `tasks_reset_at`, `/api/tasks/status` and `/api/auth/me` automatically re-aggregate and heal the balance.

---

## 6. Merchant Contract & KYC Verification Engine

```
[ New User Registration ]
           │
           ▼
[ First Contract Submission ]
  - Upload ID Front & Back + Digital Signature
  - Locked to Verified Deposit Total
           │
           ▼
[ Admin KYC Verification ]
  - Verify ID & signature
  - Verify Deposit proof
  - Approve: Credits Working Balance & Sets kyc_status = 'approved'
           │
           ▼
[ Start Optimization Tasks (Cycle 1) ]
           │
           ▼
[ Cycle Complete (All Sets Done) ]
           │
           ▼
[ Second / Subsequent Contract ]
  - Investment Amount is STRICTLY READ-ONLY (Locked to active Working Balance)
  - Admin Approval: Starts new order cycle cleanly
```

### Key Contract Rules:
1. **Strictly Non-Editable Investment Field**:
   - On `views/contract.html` and `portal-bridge.js`, the Investment Amount input is hard-locked with `readonly="readonly"`, `#f1f5f9` background, and `cursor: not-allowed`.
   - Subsequent contracts are strictly based on the merchant's active **Working Balance** (`user.balance`).
2. **Clean Cycle Start**:
   - When admin approves a subsequent contract (`approveKycAndReleaseVerifiedDeposits`), `today_tasks_completed` is reset to 0 and `current_set` to 1 so the new cycle starts without premature completion modals.

---

## 7. Withdrawal Processing Engine

### A. Pre-flight Withdrawal Validations
Withdrawals (`POST /api/finance/withdraw`) are blocked if:
1. `user.balance < 0` (Working balance is in deficit).
2. Any active task or order is in progress (`ASSIGNED`, `PENDING`, `PROCESSING`, `SHORTFALL`).
3. Daily orders are incomplete (`completedTasks < maxTasks`).
4. Requested amount exceeds `user.commission_balance`.
5. Requested amount is below minimum (default $\$10.00$ or user custom minimum).
6. Amount contains cents (whole dollar amounts only).

### B. Admin Payout Actions

| Action | Admin Button | Balance Effect | Description |
| :--- | :--- | :--- | :--- |
| **Approve External Payout** | `Approve (Paid External)` | `frozen_balance -= amount` | Payout sent outside platform via TRC20/Bank. Balance leaves system. |
| **Approve & Reinvest** | `Approve & Reinvest` | `frozen_balance -= amount`<br>`balance += amount` | Funds move directly into Working Balance for next cycle. |
| **Reject & Refund** | `Reject & Refund` | `frozen_balance -= amount`<br>`commission_balance += amount` | Funds return directly to withdrawable Total Balance with Commission. |

---

## 8. Real-Time Admin Alerts & Audio System

To ensure administrators never miss high-priority requests:
1. **New Deposit Request**: Triggers audio chime (`chime.mp3`) + notification badge.
2. **New Withdrawal Request**: Triggers audio chime (`chime.mp3`) + notification badge.
3. **New KYC Submission**: Triggers audio chime (`chime.mp3`).
4. **Live Customer Chat (Critical Recurring Alert)**:
   - When a customer sends a message and it remains unread:
   - **Ring chime lasts 3 seconds and repeats every 5 seconds** until an admin opens the chat or replies.
   - Pulsing visual banner in the admin navigation header.
5. **Browser Autoplay Policy**: Includes interactive audio unlock (`audioUnlocked` listener on click/keydown) to guarantee clean playback across Chrome, Safari, and Edge.

---

## 9. Database Schema Overview

```sql
-- Core users table
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  balance DECIMAL(15, 2) DEFAULT 0.00,             -- Working Balance
  commission_balance DECIMAL(15, 2) DEFAULT 0.00,  -- Total Balance with Commission (Withdrawable)
  frozen_balance DECIMAL(15, 2) DEFAULT 0.00,      -- In-withdrawal or shortfall frozen
  today_profit DECIMAL(15, 2) DEFAULT 0.00,        -- Accumulated daily commission
  today_tasks_completed INT DEFAULT 0,
  total_tasks_completed INT DEFAULT 0,
  current_set INT DEFAULT 1,
  kyc_status VARCHAR(50) DEFAULT 'none',
  vip_level INT DEFAULT 1,
  custom_daily_limit INT DEFAULT NULL,
  custom_order_num INT DEFAULT NULL,
  tasks_reset_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
  id VARCHAR(50) PRIMARY KEY,
  order_number VARCHAR(100) UNIQUE NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  task_id VARCHAR(50),
  product_name VARCHAR(255) NOT NULL,
  unit_price DECIMAL(15, 2) NOT NULL,
  gross_amount DECIMAL(15, 2) NOT NULL,
  commission_amount DECIMAL(15, 2) NOT NULL,
  commission_rate DECIMAL(5, 4) DEFAULT 0.2000,
  payment_status VARCHAR(50) DEFAULT 'PENDING',    -- PENDING, SHORTFALL, PAID, CANCELLED
  order_status VARCHAR(50) DEFAULT 'ASSIGNED',     -- ASSIGNED, PROCESSING, COMPLETED, CANCELLED
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME DEFAULT NULL
);

-- Tasks table
CREATE TABLE tasks (
  id VARCHAR(50) PRIMARY KEY,
  order_number VARCHAR(100) NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  product_price DECIMAL(15, 2) NOT NULL,
  commission_amount DECIMAL(15, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',            -- pending, completed, cancelled
  is_deficit TINYINT(1) DEFAULT 0,
  deficit_amount DECIMAL(15, 2) DEFAULT 0.00,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME DEFAULT NULL
);

-- Financial withdrawals table
CREATE TABLE withdrawals (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  user_email VARCHAR(150) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  method VARCHAR(50) NOT NULL,
  network VARCHAR(50) DEFAULT 'TRC20',
  wallet_address VARCHAR(255),
  bank_name VARCHAR(150),
  account_name VARCHAR(150),
  account_number VARCHAR(150),
  status VARCHAR(50) DEFAULT 'pending',            -- pending, approved, reinvested, rejected
  admin_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Double-entry ledger transactions
CREATE TABLE ledger_transactions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  order_id VARCHAR(50),
  task_id VARCHAR(50),
  admin_id VARCHAR(50),
  type VARCHAR(50) NOT NULL,                       -- DEPOSIT, WITHDRAWAL, REWARD, ORDER_RESERVE, SHORTFALL_SETTLE
  amount DECIMAL(15, 2) NOT NULL,
  balance_before DECIMAL(15, 2) NOT NULL,
  balance_after DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  reference VARCHAR(150),
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 10. Developer Troubleshooting & Maintenance Guide

### Common Gotchas & Fixes

1. **`ReferenceError: workBalance is not defined`**:
   - When modifying `POST /api/finance/withdraw`, always ensure `const workBalance = parseFloat(user.balance || 0);` is declared at the top of the route handler before being referenced in responses or audit logs.

2. **Push Order Disappearing / Premature Contract Modal**:
   - In `POST /api/tasks/generate`, active incomplete orders in `orders` (`ASSIGNED`, `PENDING`, `PROCESSING`, `SHORTFALL`) and pending tasks in `tasks` **must be checked and returned FIRST**. Never place the `effectiveCompleted >= maxTasks` quota check above pending task evaluation.

3. **Counter Displaying `5 / 5` instead of `5 / 6`**:
   - Ensure `maxTasks` in `tasks.js` and `finance.js` uses:
     `maxTasks = Math.max(maxTasks, completedTasks + totalIncompleteCount)`.
   - Never restrict the pending count check solely to `order_status = "ASSIGNED"`.

4. **Withdrawal from Working Balance**:
   - Working balance is non-withdrawable. Ensure `availableWithdrawable = commBalance` in `finance.js` and withdraw card values in `portal-bridge.js` bind strictly to `user.commission_balance`.

5. **Running Test Suites**:
   - Run all automated unit and integration tests from the root directory:
     ```powershell
     npm test
     ```
   - Target tests cover contracts, withdrawals, push orders, assignment notifications, and product categories.

6. **VPS Deployment & Service Restart**:
   - Production server runs under PM2:
     ```bash
     pm2 restart server || pm2 start server.js --name "ads-merchants"
     ```

---
*Maintained by Engineering & AI Pair Programming Agent. Single Source of Truth.*
