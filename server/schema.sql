CREATE TABLE IF NOT EXISTS settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  fullname VARCHAR(255) NOT NULL,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  gender VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  vip_level VARCHAR(50) DEFAULT 'Bronze',
  balance DECIMAL(15,2) DEFAULT 0.00,
  frozen_balance DECIMAL(15,2) DEFAULT 0.00,
  today_profit DECIMAL(15,2) DEFAULT 0.00,
  today_tasks_completed INT DEFAULT 0,
  total_tasks_completed INT DEFAULT 0,
  current_set INT DEFAULT 0,
  invite_code VARCHAR(50),
  kyc_status VARCHAR(50) DEFAULT 'none',
  kyc_notes TEXT,
  custom_order_num INT DEFAULT NULL,
  custom_deficit_amount DECIMAL(15,2) DEFAULT NULL,
  custom_product_name VARCHAR(255) DEFAULT NULL,
  custom_product_price DECIMAL(15,2) DEFAULT NULL,
  custom_daily_limit INT DEFAULT NULL,
  task_sequence_plan TEXT DEFAULT NULL,
  last_reset_date DATE DEFAULT NULL,
  tasks_reset_at DATETIME DEFAULT NULL,
  country_code VARCHAR(10) DEFAULT NULL,
  country_name VARCHAR(100) DEFAULT NULL,
  last_ip VARCHAR(60) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kyc_submissions (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  user_email VARCHAR(255),
  name VARCHAR(255),
  front_id_image TEXT,
  back_id_image TEXT,
  signature_image TEXT,
  investment_amount DECIMAL(15,2),
  status VARCHAR(50) DEFAULT 'pending',
  rejection_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  subject VARCHAR(255),
  message TEXT,
  admin_reply TEXT,
  status VARCHAR(50) DEFAULT 'open',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  replied_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  product_id INT,
  product_name VARCHAR(255),
  product_price DECIMAL(15,2),
  commission_rate DECIMAL(5,4),
  commission_earned DECIMAL(15,2),
  status VARCHAR(50) DEFAULT 'completed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS deposits (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  user_email VARCHAR(255),
  amount DECIMAL(15,2),
  method VARCHAR(50),
  txid VARCHAR(255),
  proof_image TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  admin_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  user_email VARCHAR(255),
  amount DECIMAL(15,2),
  bank_name VARCHAR(255),
  account_name VARCHAR(255),
  account_number VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  admin_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  price DECIMAL(15,2),
  image TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  message TEXT,
  type VARCHAR(50) DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  sender VARCHAR(20) DEFAULT 'user',
  message_text TEXT,
  read_by_admin BOOLEAN DEFAULT FALSE,
  read_by_user BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admins (
  id VARCHAR(50) PRIMARY KEY,
  fullname VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'sub_admin',
  status VARCHAR(50) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(50) PRIMARY KEY,
  order_number VARCHAR(60) UNIQUE NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  merchant_id VARCHAR(50) DEFAULT NULL,
  task_id VARCHAR(50) DEFAULT NULL,
  product_id INT DEFAULT NULL,
  product_name VARCHAR(255) NOT NULL,
  product_image TEXT,
  category VARCHAR(100) DEFAULT 'General',
  unit_price DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  quantity INT NOT NULL DEFAULT 1,
  subtotal DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  discount_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
  discount_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  tax_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
  tax_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  fee_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  gross_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.2000,
  commission_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  reward_rate DECIMAL(5,4) NOT NULL DEFAULT 0.2000,
  reward_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  user_deduction DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  payment_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  order_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX (user_id),
  INDEX (order_status),
  INDEX (created_at)
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id VARCHAR(60) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  order_id VARCHAR(60) DEFAULT NULL,
  task_id VARCHAR(60) DEFAULT NULL,
  admin_id VARCHAR(50) DEFAULT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  balance_before DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  balance_after DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) DEFAULT 'USD',
  reference VARCHAR(100) DEFAULT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX (user_id),
  INDEX (transaction_type),
  INDEX (created_at)
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100) DEFAULT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  ip_address VARCHAR(60) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (admin_id),
  INDEX (action),
  INDEX (created_at)
);

-- Seed Super Admin
INSERT IGNORE INTO admins (id, fullname, email, password_hash, role, status) VALUES 
('adm_super_01', 'Haider Usama (Super Admin)', 'haiderusama707@gmail.com', '$2a$10$rivBQfrtPN44a4B0xCVmbu9y/EuyazJLNC0L433WMnO18yJKTYSfi', 'super_admin', 'active');

-- Seed Settings
INSERT IGNORE INTO settings (setting_key, setting_value) VALUES 
('admin_email', 'haiderusama707@gmail.com'),
('admin_password_hash', '$2a$10$rivBQfrtPN44a4B0xCVmbu9y/EuyazJLNC0L433WMnO18yJKTYSfi'),
('trc20_address', 'TJ8Yg9pKaV8vU3mQ2jN5xL7wE1tZ4dC6bA'),
('erc20_address', '0x88922C0A5A901F1aA719d3f1FeA6bA34B20C888A'),
('btc_address', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'),
('telegram_support', 'https://t.me/adsmerchantsasia_support'),
('whatsapp_support', '+60112345678'),
('min_deposit', '20'),
('min_withdraw', '30'),
('daily_tasks_limit', '38'),
('vip_rates', '{"Bronze":{"commission":0.20,"min_balance":0,"max_tasks":38},"Silver":{"commission":0.30,"min_balance":500,"max_tasks":45},"Gold":{"commission":0.40,"min_balance":2000,"max_tasks":55},"Diamond":{"commission":0.50,"min_balance":5000,"max_tasks":65},"Platinum":{"commission":0.50,"min_balance":5000,"max_tasks":65}}');

-- Seed Products
INSERT IGNORE INTO products (id, name, price, image) VALUES 
(1, 'Apple iPhone 16 Pro Max 256GB - Desert Titanium', 1199.00, 'client/assets/uploads/products/iphone_16.jpg'),
(2, 'Sony WH-1000XM5 Wireless Noise-Canceling Headphones', 399.00, 'client/assets/uploads/products/sony_headphones.jpg'),
(3, 'Samsung Galaxy Tab S9 Ultra 512GB WiFi', 999.00, 'client/assets/uploads/products/samsung_tv.jpg'),
(4, 'Dyson V15 Detect Cordless Vacuum Cleaner', 749.00, 'client/assets/uploads/products/dyson_vacuum.jpg'),
(5, 'Nespresso Vertuo Next Coffee & Espresso Machine', 179.00, 'client/assets/uploads/products/espresso_machine.jpg'),
(6, 'DJI Mini 4 Pro Fly More Combo Drone with RC 2', 859.00, 'client/assets/uploads/products/dji_drone.jpg'),
(7, 'Anker Prime 20,000mAh Power Bank 200W Output', 129.00, 'client/assets/uploads/products/power_station.jpg'),
(8, 'Logitech MX Master 3S Advanced Wireless Mouse', 99.00, 'client/assets/uploads/products/dewalt_drill.jpg'),
(9, 'Bose QuietComfort Ultra Wireless Earbuds', 299.00, 'client/assets/uploads/products/soundbar.jpg'),
(10, 'Kindle Paperwhite Signature Edition 32GB', 189.00, 'client/assets/uploads/products/macbook_air.jpg');

