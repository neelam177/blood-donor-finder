-- ============================================
-- BloodConnect Database Schema
-- Version: 1.0
-- MySQL 8.0+
-- ============================================

-- Create database
CREATE DATABASE IF NOT EXISTS blood_donor_db 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE blood_donor_db;

-- ============================================
-- Table: users
-- Stores user authentication and basic info
-- ============================================
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL COMMENT 'Full name of user',
  email VARCHAR(150) NOT NULL UNIQUE COMMENT 'Email address (must be unique)',
  password_hash VARCHAR(255) NOT NULL COMMENT 'Bcrypt hashed password',
  phone VARCHAR(10) NOT NULL COMMENT '10 digit phone number',
  role ENUM('user', 'admin') DEFAULT 'user' COMMENT 'User role',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Account creation time',
  
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User authentication and profile data';

-- ============================================
-- Table: donor_profiles
-- Stores donor-specific information
-- ============================================
CREATE TABLE donor_profiles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT 'Reference to users table',
  blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL COMMENT 'Blood group',
  gender ENUM('male', 'female', 'other') NOT NULL COMMENT 'Gender',
  age INT NOT NULL CHECK (age >= 18 AND age <= 65) COMMENT 'Age (must be 18-65)',
  city VARCHAR(100) NOT NULL COMMENT 'City name',
  state VARCHAR(100) NOT NULL COMMENT 'State name',
  last_donation_date DATE NULL COMMENT 'Last blood donation date (optional)',
  is_available BOOLEAN DEFAULT TRUE COMMENT 'Available to donate (true/false)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Profile creation time',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update time',
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_blood_group (blood_group),
  INDEX idx_city (city),
  INDEX idx_available (is_available),
  INDEX idx_user_id (user_id),
  INDEX idx_composite (blood_group, city, is_available) COMMENT 'Composite index for search'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Donor profile information for blood donation';

-- ============================================
-- Table: blood_requests
-- Stores blood requirement requests
-- ============================================
CREATE TABLE blood_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  requester_id INT NOT NULL COMMENT 'User who created the request',
  patient_name VARCHAR(100) NOT NULL COMMENT 'Patient name needing blood',
  blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL COMMENT 'Required blood group',
  units_needed INT NOT NULL CHECK (units_needed > 0) COMMENT 'Number of blood units needed',
  hospital VARCHAR(200) NOT NULL COMMENT 'Hospital name',
  city VARCHAR(100) NOT NULL COMMENT 'Hospital city',
  contact_phone VARCHAR(10) NOT NULL COMMENT 'Contact phone number',
  urgency ENUM('normal', 'urgent', 'critical') DEFAULT 'normal' COMMENT 'Request urgency level',
  note TEXT NULL COMMENT 'Additional notes (optional)',
  needed_by DATE NOT NULL COMMENT 'Date blood is needed by',
  status ENUM('open', 'fulfilled', 'closed') DEFAULT 'open' COMMENT 'Request status',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Request creation time',
  
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_blood_group (blood_group),
  INDEX idx_city (city),
  INDEX idx_status (status),
  INDEX idx_urgency (urgency),
  INDEX idx_requester (requester_id),
  INDEX idx_created (created_at),
  INDEX idx_composite (blood_group, city, status) COMMENT 'Composite index for search'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Blood requirement requests from users';

-- ============================================
-- Table: request_responses
-- Stores donor responses to blood requests
-- ============================================
CREATE TABLE request_responses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  request_id INT NOT NULL COMMENT 'Reference to blood_requests',
  donor_id INT NOT NULL COMMENT 'User who responded (donor)',
  message TEXT NULL COMMENT 'Optional message from donor',
  status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending' COMMENT 'Response status',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Response creation time',
  
  FOREIGN KEY (request_id) REFERENCES blood_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_response (request_id, donor_id) COMMENT 'One response per donor per request',
  INDEX idx_request (request_id),
  INDEX idx_donor (donor_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Donor responses to blood requests';

-- ============================================
-- Sample Data (Optional - for testing)
-- ============================================

-- Insert sample admin user (password: Admin@123)
INSERT INTO users (name, email, password_hash, phone, role) VALUES 
('Admin User', 'admin@bloodconnect.com', '$2a$10$8Y5K5Y5K5Y5K5Y5K5Y5K5e0x0x0x0x0x0x0x0x0x0x0x0x0', '9876543210', 'admin');

-- Insert sample regular users (password: Test@123)
INSERT INTO users (name, email, password_hash, phone, role) VALUES 
('Rahul Sharma', 'rahul@example.com', '$2a$10$8Y5K5Y5K5Y5K5Y5K5Y5K5e0x0x0x0x0x0x0x0x0x0x0x0x0', '9876543211', 'user'),
('Priya Patel', 'priya@example.com', '$2a$10$8Y5K5Y5K5Y5K5Y5K5Y5K5e0x0x0x0x0x0x0x0x0x0x0x0x0', '9876543212', 'user'),
('Amit Kumar', 'amit@example.com', '$2a$10$8Y5K5Y5K5Y5K5Y5K5Y5K5e0x0x0x0x0x0x0x0x0x0x0x0x0', '9876543213', 'user');

-- Note: Use the actual bcrypt hash from your registration for real passwords
-- The hashes above are placeholders

-- ============================================
-- Verification Queries
-- ============================================

-- Check all tables created
SHOW TABLES;

-- Check table structures
DESCRIBE users;
DESCRIBE donor_profiles;
DESCRIBE blood_requests;
DESCRIBE request_responses;

-- Check indexes
SHOW INDEX FROM users;
SHOW INDEX FROM donor_profiles;
SHOW INDEX FROM blood_requests;
SHOW INDEX FROM request_responses;

-- Count records (should be 0 for fresh install)
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'donor_profiles', COUNT(*) FROM donor_profiles
UNION ALL
SELECT 'blood_requests', COUNT(*) FROM blood_requests
UNION ALL
SELECT 'request_responses', COUNT(*) FROM request_responses;

-- ============================================
-- Database Statistics
-- ============================================

SELECT 
  table_name AS 'Table',
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)',
  table_rows AS 'Rows'
FROM information_schema.TABLES 
WHERE table_schema = 'blood_donor_db'
ORDER BY (data_length + index_length) DESC;
