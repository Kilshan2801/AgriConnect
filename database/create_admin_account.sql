-- Creates the real admin account that admin-login.html, the
-- notification system, and all admin pages now depend on.
-- Safe to re-run: does nothing if the account already exists.

INSERT INTO users (id, first_name, last_name, email, phone, password, address, nic_front, nic_back, is_active)
SELECT 26, 'AgriConnect', 'Administrator', 'admin@agriconnect.com', '0000000000', 'not-used-client-side-auth', 'N/A', 'N/A', 'N/A', 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@agriconnect.com');

INSERT INTO user_roles (user_id, role)
SELECT 26, 'admin'
WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = 26 AND role = 'admin');
