ALTER TABLE rentals MODIFY COLUMN status ENUM('pending','approved','rejected','delivered','received','returned','provider_received','completed','cancelled') NOT NULL DEFAULT 'pending';

ALTER TABLE rentals ADD COLUMN completed_by_farmer_at DATETIME NULL;

ALTER TABLE rentals ADD COLUMN completed_by_provider_at DATETIME NULL;
