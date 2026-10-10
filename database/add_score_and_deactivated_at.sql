-- Adds a standing score (starts at 100, admin can reduce it when a
-- user is involved in a conflict) and tracks exactly when a user was
-- last deactivated, so "how long has this user been inactive" can be
-- calculated and shown in Manage Users.

ALTER TABLE users ADD COLUMN score INT NOT NULL DEFAULT 100;
ALTER TABLE users ADD COLUMN deactivated_at DATETIME NULL;
