CREATE TABLE control_payments (
  id Utf8 NOT NULL,
  paid_at Timestamp,
  mail_sent_at Timestamp,
  retention_until Timestamp,
  PRIMARY KEY (id)
) WITH (TTL = Interval("P0D") ON retention_until);
