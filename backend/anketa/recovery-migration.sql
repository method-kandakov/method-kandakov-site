ALTER TABLE control_payments
  ADD COLUMN verification_source Utf8,
  ADD COLUMN provider_operation_id Utf8;
