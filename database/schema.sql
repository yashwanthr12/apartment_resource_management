-- ============================================================
-- Apartment Resource Management System — Database Schema
-- Run this file once to set up the MySQL database:
--   mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS apartment_mgmt
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE apartment_mgmt;

-- ── 1. Admins ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100)  NOT NULL,
    email           VARCHAR(150)  NOT NULL UNIQUE,
    password        VARCHAR(255)  NOT NULL,          -- bcrypt hash
    apartment_name  VARCHAR(150)  NOT NULL UNIQUE,
    apartment_address TEXT        NOT NULL,
    access_code     VARCHAR(50)   DEFAULT NULL UNIQUE,
    upi_id          VARCHAR(100)  DEFAULT NULL,
    bank_details    TEXT          DEFAULT NULL,       -- legacy combined text
    bank_name       VARCHAR(150)  DEFAULT NULL,
    account_holder_name VARCHAR(150) DEFAULT NULL,
    account_number  VARCHAR(50)   DEFAULT NULL,
    ifsc_code       VARCHAR(20)   DEFAULT NULL,
    branch_name     VARCHAR(150)  DEFAULT NULL,
    qr_code         VARCHAR(255)  DEFAULT NULL,      -- file path
    deactivation_requested_at DATETIME DEFAULT NULL,
    created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── 2. Residents ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS residents (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100)  NOT NULL,
    email           VARCHAR(150)  NOT NULL UNIQUE,
    password        VARCHAR(255)  NOT NULL,          -- bcrypt hash
    house_number    VARCHAR(20)   NOT NULL,
    apartment_name  VARCHAR(150)  NOT NULL,
    is_verified     TINYINT(1)    DEFAULT 0 NOT NULL,               -- admin must verify
    is_active       TINYINT(1)    DEFAULT 1 NOT NULL,               -- soft-delete flag (0 = removed by admin)
    deactivation_requested_at DATETIME DEFAULT NULL,
    split_number    FLOAT         DEFAULT 1.0 NOT NULL,
    created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (apartment_name) REFERENCES admins(apartment_name)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── 3. Expenditures (grouped multi-category entries) ──────
CREATE TABLE IF NOT EXISTS expenditures (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    apartment_name  VARCHAR(150)  NOT NULL,
    from_date       DATE          NOT NULL,
    to_date         DATE          NOT NULL,
    total_amount    DECIMAL(10,2) NOT NULL,
    total_houses    INT           NOT NULL,
    per_person_amount DECIMAL(10,2) NOT NULL,
    created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (apartment_name) REFERENCES admins(apartment_name)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── 4. Expenses ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    apartment_name  VARCHAR(150)  NOT NULL,
    from_date       DATE          NOT NULL,
    to_date         DATE          NOT NULL,
    category        ENUM('electricity','water','maintenance','security','elevator','other') NOT NULL,
    custom_category VARCHAR(100)  DEFAULT NULL,
    amount          DECIMAL(10,2) NOT NULL,
    units_used      DECIMAL(10,2) DEFAULT NULL,
    unit_type       VARCHAR(20)   DEFAULT NULL,      -- kWh, liters, etc.
    total_houses    INT           NOT NULL,
    expenditure_id  INT           DEFAULT NULL,       -- links to grouped expenditure
    created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (apartment_name) REFERENCES admins(apartment_name)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (expenditure_id) REFERENCES expenditures(id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── 5. Bills ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bills (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    resident_id     INT           NOT NULL,
    expense_id      INT           NOT NULL,
    split_amount    DECIMAL(10,2) NOT NULL,
    created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resident_id) REFERENCES residents(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (expense_id)  REFERENCES expenses(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── 6. Payments ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    resident_id     INT           NOT NULL,
    bill_id         INT           NOT NULL,
    status          ENUM('pending','paid','rejected') DEFAULT 'pending',
    receipt_image   VARCHAR(255)  DEFAULT NULL,      -- file path
    verified        TINYINT(1)    DEFAULT 0,
    created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (resident_id) REFERENCES residents(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (bill_id)     REFERENCES bills(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── 7. Email Logs ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_logs (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    recipient_email VARCHAR(150)  NOT NULL,
    resident_id     INT           DEFAULT NULL,
    bill_id         INT           DEFAULT NULL,
    expenditure_id  INT           DEFAULT NULL,
    status          VARCHAR(50)   NOT NULL,
    message_id      VARCHAR(100)  DEFAULT NULL,
    failure_reason  TEXT          DEFAULT NULL,
    sent_at         DATETIME      DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resident_id) REFERENCES residents(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (bill_id)     REFERENCES bills(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (expenditure_id) REFERENCES expenditures(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;


