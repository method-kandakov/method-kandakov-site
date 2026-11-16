-- One code and one order alias point to the same issued PKCH. No private card contents.
CREATE TABLE issued_pkch (
  reference Utf8 NOT NULL,
  code Utf8,
  order_id Utf8,
  email Utf8,
  deadline_ms Uint64,
  delivery_confirmed_at Timestamp,
  retention_until Timestamp NOT NULL,
  PRIMARY KEY (reference)
) WITH (TTL = Interval("PT0S") ON retention_until);
