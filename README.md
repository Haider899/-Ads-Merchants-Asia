# 🌐 Ads Merchants Asia - Enterprise E-Commerce Optimization Platform

A modern, full-stack merchant order optimization and financial portal built with Node.js, Express, JavaScript, and Bootstrap.

---

## 🌟 Overview

**Ads Merchants Asia** provides an end-to-end platform for merchant commission optimization, featuring dynamic VIP tier calculations, crypto deposit & withdrawal management (USDT TRC20, ERC20, BTC), KYC document verification, and a comprehensive Master Admin Control Center.

---

## ✨ Key Features

### 👤 Member Portal
- **🔐 Secure Authentication**: JWT & cookie-based session management, account registration with invitation codes, and instant password reset.
- **⚡ Task & Order Matching Engine**: Intelligent product order grabbing algorithm with tiered daily commission rates (Bronze, Silver, Gold, Platinum VIP).
- **💳 Multi-Crypto Deposit**: TRC20, ERC20, and BTC wallet address integration with live payment receipt/transfer screenshot upload.
- **💸 Seamless Withdrawals**: Automated balance locking, withdrawal requests, and historical record tracking.
- **🪪 KYC & Verification Contract**: Interactive canvas signature pad and ID card (Front & Back) document upload dropzones with live previews.
- **🔔 Real-Time Action Notifications**: Instant automated alerts whenever admin approves or rejects deposits, withdrawals, or KYC documents.

### 👑 Master Admin Control Center (`/admin`)
- **👥 User Account Management**: Live working balance & frozen balance modifier, VIP tier upgrades, daily order count reset, and direct password reset.
- **🪪 Identity Verification (KYC)**: High-resolution document inspector modal for Front ID, Back ID, and Signatures with 1-click Approve, Reject (with reason), or Request Re-upload.
- **🧾 Deposit & Receipt Inspector**: Full-resolution payment screenshot previewer with blockchain TxHash copy and 1-click approval/credit.
- **💸 Withdrawal Payout Management**: Direct approval to mark payouts as paid or reject & refund funds instantly back to the user's working balance.
- **⚙️ Crypto Wallet Configuration**: Dynamic configuration of TRC20, ERC20, BTC receiving addresses, minimum deposit/withdrawal limits, and support channel links.
- **✨ SweetAlert2 UI/UX**: Clean modal popups replacing native alerts with interactive confirmation dialogues.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: Persistent JSON Storage Engine (`server/db.js`)
- **Frontend**: HTML5, Vanilla JavaScript (ES6+), CSS3 / Flexbox / Grid
- **UI Frameworks**: Bootstrap 4.6, SweetAlert2, FontAwesome 6
- **Security**: BCrypt password hashing, JSON Web Tokens (JWT), Cookie-Parser, CORS

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.0.0 or later)
- npm (v9.0.0 or later)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Haider899/-Ads-Merchants-Asia.git
   cd -Ads-Merchants-Asia
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the application:**
   ```bash
   node server.js
   ```

4. **Access the portal:**
   - **Member Portal**: [http://localhost:3000/login](http://localhost:3000/login)
   - **Member Dashboard**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
   - **Master Admin Panel**: [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 🔑 Default Credentials

### Demo Member Account
- **Email**: `repofa5484@prorises.com`
- **Password**: `Password`

### Master Admin Account
- **Email**: `admin@adsmerchantsasia.com`
- **Password**: `AdminPass2026!`

---

## 📁 Project Structure

```
├── client/
│   └── assets/js/
│       ├── admin.js             # Master Admin Center controller
│       └── portal-bridge.js     # Client API communication bridge
├── server/
│   ├── db.js                    # Database storage engine & helpers
│   ├── middleware/
│   │   └── auth.js              # Member & Admin JWT auth middleware
│   └── routes/
│       ├── admin.js             # Admin management endpoints
│       ├── auth.js              # Authentication routes
│       ├── finance.js           # Deposits, withdrawals & wallets
│       ├── tasks.js             # Order matching & yields
│       └── user.js              # Profiles, KYC & notifications
├── assets/                      # Static branding, logos & contract templates
├── css/                         # Custom stylesheets
├── js/                          # App core scripts
├── admin.html                   # Master Admin Control Center
├── contract.html                # KYC & Merchant Application
├── dashboard.html               # Main Member Dashboard
├── deposit.html                 # Crypto Deposit Portal
├── login.html                   # Member Sign In
├── profile.html                 # Profile & Account Management
├── record.html                  # Order & Transaction History
├── register.html                # Member Registration
├── server.js                    # Express Application Entry Point
├── start.html                   # Task Optimization Arena
└── withdraw.html                # Member Payout Request Portal
```

---

## 📄 License
This project is licensed under the MIT License.
