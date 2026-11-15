-- GreenMind 数据库建表语句（MySQL 8，utf8mb4）
-- 与 app/models 中的 SQLAlchemy 模型一一对应；开发环境也可由应用 create_all 自动建表。
CREATE DATABASE IF NOT EXISTS greenmind DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE greenmind;

-- CEMS 原始数据表（现成数据，只读）
CREATE TABLE IF NOT EXISTS cems_raw (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  ts DATETIME NOT NULL COMMENT '数据时间，4—5 分钟一条',
  device_id VARCHAR(32) NOT NULL COMMENT '监测点编号，如 CEMS-01',
  furnace_temp FLOAT COMMENT '炉温 ℃',
  flow FLOAT COMMENT '烟气流量 m³/h',
  o2 FLOAT COMMENT '氧含量 %',
  flue_temp FLOAT COMMENT '烟气温度 ℃',
  flue_pressure FLOAT COMMENT '烟气压力 Pa',
  flue_velocity FLOAT COMMENT '烟气流速 m/s',
  flue_humidity FLOAT COMMENT '烟气湿度 %',
  pm_real FLOAT, pm_std FLOAT, pm_limit FLOAT COMMENT '颗粒物 实测/折算/标准 mg/m³',
  so2_real FLOAT, so2_std FLOAT, so2_limit FLOAT COMMENT 'SO₂ 实测/折算/标准',
  nox_real FLOAT, nox_std FLOAT, nox_limit FLOAT COMMENT 'NOₓ 实测/折算/标准',
  co_real FLOAT, co_std FLOAT, co_limit FLOAT COMMENT 'CO 实测/折算/标准',
  hcl_real FLOAT, hcl_std FLOAT, hcl_limit FLOAT COMMENT 'HCl 实测/折算/标准',
  condition_flag VARCHAR(16) NOT NULL DEFAULT 'normal' COMMENT 'normal/startup/shutdown/fault',
  report_flag TINYINT NOT NULL DEFAULT 1 COMMENT '数采仪上报标记 1=正常',
  comm_flag TINYINT NOT NULL DEFAULT 0 COMMENT '通讯中断标记 1=中断',
  exceed_flag TINYINT NOT NULL DEFAULT 0 COMMENT '(超) 标记',
  zero_flag TINYINT NOT NULL DEFAULT 0 COMMENT '(零) 标记',
  INDEX idx_device_ts (device_id, ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 用户表
CREATE TABLE IF NOT EXISTS `user` (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(32) NOT NULL UNIQUE,
  password_hash VARCHAR(128) NOT NULL,
  real_name VARCHAR(32),
  role ENUM('admin','engineer','viewer') NOT NULL DEFAULT 'viewer',
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 设备台账
CREATE TABLE IF NOT EXISTS device (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(64) NOT NULL,
  type VARCHAR(32),
  install_date DATE,
  design_life_years INT,
  last_calibration_date DATE,
  calibration_cycle_days INT NOT NULL DEFAULT 365,
  status ENUM('running','stopped','maintenance') NOT NULL DEFAULT 'running',
  created_at DATETIME NOT NULL,
  INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 告警表
CREATE TABLE IF NOT EXISTS alarm (
  id INT PRIMARY KEY AUTO_INCREMENT,
  device_id VARCHAR(32) NOT NULL,
  ts DATETIME NOT NULL,
  level ENUM('yellow','orange','red') NOT NULL,
  pollutant VARCHAR(16) NOT NULL,
  value FLOAT NOT NULL,
  limit_val FLOAT NOT NULL,
  reason VARCHAR(255),
  status ENUM('pending','acked','closed') NOT NULL DEFAULT 'pending',
  diagnosis JSON NULL,
  workorder_id INT NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_device_ts (device_id, ts),
  INDEX idx_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 工单表
CREATE TABLE IF NOT EXISTS work_order (
  id INT PRIMARY KEY AUTO_INCREMENT,
  alarm_id INT NULL,
  device_id VARCHAR(32) NOT NULL,
  title VARCHAR(128) NOT NULL,
  description TEXT,
  priority ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  status ENUM('pending','processing','accepting','closed') NOT NULL DEFAULT 'pending',
  assignee_id INT NOT NULL,
  sla_deadline DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  accepted_at DATETIME NULL,
  finished_at DATETIME NULL,
  closed_at DATETIME NULL,
  finish_note TEXT NULL,
  accept_note TEXT NULL,
  INDEX idx_status (status),
  INDEX idx_assignee (assignee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 巡检记录表
CREATE TABLE IF NOT EXISTS inspection (
  id INT PRIMARY KEY AUTO_INCREMENT,
  device_id VARCHAR(32) NOT NULL,
  inspector_id INT NOT NULL,
  checkin_time DATETIME NOT NULL,
  checklist JSON,
  photos JSON,
  signature_path VARCHAR(255),
  abnormal_desc TEXT NULL,
  workorder_id INT NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_device (device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 趋势预测表
CREATE TABLE IF NOT EXISTS prediction (
  id INT PRIMARY KEY AUTO_INCREMENT,
  device_id VARCHAR(32) NOT NULL,
  pollutant VARCHAR(16) NOT NULL,
  base_ts DATETIME NOT NULL,
  result JSON,
  created_at DATETIME NOT NULL,
  INDEX idx_device_pollutant (device_id, pollutant)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 设备健康度表
CREATE TABLE IF NOT EXISTS health_score (
  id INT PRIMARY KEY AUTO_INCREMENT,
  device_id VARCHAR(32) NOT NULL,
  score INT NOT NULL,
  factors JSON,
  suggestion TEXT,
  scored_at DATETIME NOT NULL,
  INDEX idx_device_time (device_id, scored_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 月度报表表
CREATE TABLE IF NOT EXISTS report (
  id INT PRIMARY KEY AUTO_INCREMENT,
  period CHAR(7) NOT NULL UNIQUE,
  stats JSON,
  content_md MEDIUMTEXT,
  generated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- AI 助手会话与消息表
CREATE TABLE IF NOT EXISTS chat_session (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(128),
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_message (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL,
  role ENUM('user','assistant','tool') NOT NULL,
  content MEDIUMTEXT NOT NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 操作日志表
CREATE TABLE IF NOT EXISTS operation_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NULL,
  action VARCHAR(64) NOT NULL,
  target VARCHAR(128),
  detail JSON NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 演示账号（密码均为 123456，bcrypt 已哈希，也可用 scripts/seed_demo.py 重新生成）
-- INSERT INTO `user` (username, password_hash, real_name, role, created_at) VALUES
-- ('admin', '<bcrypt-hash>', '管理员', 'admin', NOW()),
-- ('engineer1', '<bcrypt-hash>', '张工', 'engineer', NOW()),
-- ('engineer2', '<bcrypt-hash>', '李工', 'engineer', NOW()),
-- ('viewer', '<bcrypt-hash>', '访客', 'viewer', NOW());
