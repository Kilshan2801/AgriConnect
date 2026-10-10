ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS completed_by_user_one_at DATETIME NULL AFTER completed_at,
  ADD COLUMN IF NOT EXISTS completed_by_user_two_at DATETIME NULL AFTER completed_by_user_one_at;
