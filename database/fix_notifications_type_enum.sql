ALTER TABLE notifications MODIFY COLUMN type ENUM('order','rental','consultation','registration','report','system','message','account','admin_warning') NOT NULL;
