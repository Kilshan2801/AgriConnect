-- =====================================================
-- AgriConnect Database Schema
-- Reconstructed from application code (no schema.sql
-- was included in the original project export) and
-- extended with the tables needed to close the backend
-- gaps: messages, notifications, calendar activities,
-- plus admin user-management columns.
--
-- Safe to run on a fresh database. Existing installs:
-- run only the "NEW TABLES" / "ALTER" sections below.
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------
-- users
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    phone         VARCHAR(20)  NOT NULL,
    email         VARCHAR(150) NULL,
    password      VARCHAR(255) NOT NULL,
    address       VARCHAR(255) NULL,
    nic_front     VARCHAR(255) NULL,
    nic_back      VARCHAR(255) NULL,
    is_active     TINYINT(1)   NOT NULL DEFAULT 1,
    removed_at    DATETIME     NULL,
    removed_reason VARCHAR(255) NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_phone (phone),
    UNIQUE KEY uniq_email (email)
);

-- ---------------------------------------------------
-- user_roles  (one row per role a user account holds)
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS user_roles (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    role       ENUM('farmer','buyer','expert','equipment_provider','admin') NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_user_role (user_id, role),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------
-- registrations (approval workflow for expert / provider)
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS registrations (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    user_id            INT NOT NULL,
    registration_type  ENUM('expert','equipment_provider') NOT NULL,
    status             ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    reviewed_by        INT NULL,
    review_note        VARCHAR(500) NULL,
    created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at        DATETIME NULL,
    CONSTRAINT fk_registrations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------
-- profile tables
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS farmer_profiles (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    phone      VARCHAR(20) NULL,
    district   VARCHAR(100) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_farmer_user (user_id),
    CONSTRAINT fk_farmer_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS buyer_profiles (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    phone      VARCHAR(20) NULL,
    district   VARCHAR(100) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_buyer_user (user_id),
    CONSTRAINT fk_buyer_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expert_profiles (
    id                     INT AUTO_INCREMENT PRIMARY KEY,
    user_id                INT NOT NULL,
    phone                  VARCHAR(20) NULL,
    specialization         VARCHAR(150) NULL,
    qualification          VARCHAR(255) NULL,
    experience_years       INT NULL,
    bio                    VARCHAR(1000) NULL,
    certification_document VARCHAR(255) NULL,
    approval_status        ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_expert_user (user_id),
    CONSTRAINT fk_expert_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS equipment_provider_profiles (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    user_id              INT NOT NULL,
    phone                VARCHAR(20) NULL,
    district             VARCHAR(100) NULL,
    business_name        VARCHAR(150) NULL,
    business_description VARCHAR(1000) NULL,
    proof_document       VARCHAR(255) NULL,
    approval_status      ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_provider_user (user_id),
    CONSTRAINT fk_provider_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------
-- crops
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS crops (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    farmer_id      INT NOT NULL,
    crop_name      VARCHAR(150) NOT NULL,
    specific_name  VARCHAR(150) NULL,
    harvested_date DATE NULL,
    price_per_kg   DECIMAL(10,2) NOT NULL,
    quantity       DECIMAL(10,2) NOT NULL,
    description    VARCHAR(1000) NULL,
    image          VARCHAR(255) NULL,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_crops_farmer FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crop_images (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    crop_id    INT NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_crop_images_crop FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE
);

-- ---------------------------------------------------
-- orders
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    buyer_id          INT NOT NULL,
    farmer_id         INT NOT NULL,
    crop_id           INT NOT NULL,
    quantity          DECIMAL(10,2) NOT NULL,
    price_per_kg      DECIMAL(10,2) NOT NULL,
    total_amount      DECIMAL(10,2) NOT NULL,
    delivery_address  VARCHAR(255) NULL,
    status            ENUM('pending','accepted','rejected','delivered','completed','cancelled') NOT NULL DEFAULT 'pending',
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NULL,
    CONSTRAINT fk_orders_buyer  FOREIGN KEY (buyer_id)  REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_orders_farmer FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_orders_crop   FOREIGN KEY (crop_id)   REFERENCES crops(id) ON DELETE CASCADE
);

-- ---------------------------------------------------
-- equipment + rentals
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS equipment (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    provider_id         INT NOT NULL,
    equipment_name      VARCHAR(150) NOT NULL,
    category            VARCHAR(100) NULL,
    description         VARCHAR(1000) NULL,
    rental_price        DECIMAL(10,2) NOT NULL,
    price_unit          VARCHAR(50) NULL,
    availability_status ENUM('available','in_rent','maintenance') NOT NULL DEFAULT 'available',
    image               VARCHAR(255) NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_equipment_provider FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rentals (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    equipment_id  INT NOT NULL,
    renter_id     INT NOT NULL,
    provider_id   INT NOT NULL,
    quantity      INT NOT NULL DEFAULT 1,
    start_date    DATE NOT NULL,
    end_date      DATE NOT NULL,
    total_amount  DECIMAL(10,2) NOT NULL,
    status        ENUM('pending','approved','active','rejected','completed','cancelled') NOT NULL DEFAULT 'pending',
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NULL,
    CONSTRAINT fk_rentals_equipment FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
    CONSTRAINT fk_rentals_renter    FOREIGN KEY (renter_id)    REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_rentals_provider  FOREIGN KEY (provider_id)  REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------
-- reports (issue reports + admin-resolved conflicts)
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    reporter_id     INT NOT NULL,
    report_type     VARCHAR(50) NOT NULL,
    priority        ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
    related_to      VARCHAR(50) NULL,
    related_id      INT NULL,
    subject         VARCHAR(200) NOT NULL,
    description     VARCHAR(2000) NOT NULL,
    contact_method  VARCHAR(50) NULL,
    attachment      VARCHAR(255) NULL,
    status          ENUM('pending','in_review','resolved','rejected') NOT NULL DEFAULT 'pending',
    admin_note      VARCHAR(1000) NULL,
    resolved_by     INT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at     DATETIME NULL,
    CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- NEW TABLES  (close the previously-missing gaps)
-- =====================================================

-- ---------------------------------------------------
-- conversations + messages
-- Backs: Messages (farmer/buyer/provider/expert) and
-- Consultations chat threads. user_one_id is always the
-- smaller of the two user ids so a pair only ever has
-- one conversation row per context.
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    user_one_id    INT NOT NULL,
    user_two_id    INT NOT NULL,
    context_type   ENUM('order','rental','consultation','general') NOT NULL DEFAULT 'general',
    context_id     INT NULL,
    completed_at   DATETIME NULL,
    last_message_at DATETIME NULL,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_conversation (user_one_id, user_two_id, context_type, context_id),
    CONSTRAINT fk_conversations_user_one FOREIGN KEY (user_one_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_conversations_user_two FOREIGN KEY (user_two_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_id       INT NOT NULL,
    receiver_id     INT NOT NULL,
    message_text    VARCHAR(2000) NULL,
    attachment      VARCHAR(255) NULL,
    is_read         TINYINT(1) NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_sender   FOREIGN KEY (sender_id)   REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------
-- notifications
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT NOT NULL,
    type         VARCHAR(50) NOT NULL,
    title        VARCHAR(200) NOT NULL,
    message      VARCHAR(500) NOT NULL,
    related_type VARCHAR(50) NULL,
    related_id   INT NULL,
    is_read      TINYINT(1) NOT NULL DEFAULT 0,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------
-- activities (farming activity calendar)
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS activities (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    user_id        INT NOT NULL,
    title          VARCHAR(200) NOT NULL,
    description    VARCHAR(1000) NULL,
    activity_date  DATE NOT NULL,
    activity_type  VARCHAR(50) NULL,
    status         ENUM('pending','completed') NOT NULL DEFAULT 'pending',
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_activities_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

SET FOREIGN_KEY_CHECKS = 1;
