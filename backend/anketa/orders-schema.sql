-- Additive migration. Existing paid control order and questionnaire remain intact.
CREATE TABLE orders (
  id Utf8 NOT NULL,
  request_key Utf8 NOT NULL,
  email Utf8 NOT NULL,
  product Utf8 NOT NULL,
  amount_minor Uint64 NOT NULL,
  status Utf8 NOT NULL,
  created_ms Uint64 NOT NULL,
  deadline_ms Uint64 NOT NULL,
  offer_version Utf8 NOT NULL,
  privacy_version Utf8 NOT NULL,
  paid_at Timestamp,
  link_sent_at Timestamp,
  owner_order_notified_at Timestamp,
  delivery_retry_at Timestamp,
  retention_until Timestamp NOT NULL,
  PRIMARY KEY (id)
) WITH (TTL = Interval("P0D") ON retention_until);

ALTER TABLE submissions ADD COLUMN notification_retry_at Timestamp;
