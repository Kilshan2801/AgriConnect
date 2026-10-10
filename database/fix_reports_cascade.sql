ALTER TABLE reports MODIFY COLUMN reporter_id INT NULL;

ALTER TABLE reports DROP FOREIGN KEY fk_reports_reporter;

ALTER TABLE reports ADD CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL;
