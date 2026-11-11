ALTER TABLE control_payments
  ADD COLUMN verification_source Utf8,
  ADD COLUMN provider_operation_id Utf8;

ALTER TABLE submissions ADD COLUMN owner_notified_at Timestamp;
