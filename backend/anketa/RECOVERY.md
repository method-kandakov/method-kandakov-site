# Recovery of the single control order

Apply recovery-migration.sql once before using the IAM-only recovery operation.

The public callback still requires its signature. The private function accepts
`controlDiagnostic: fulfill-reviewed-control-order` only in a raw invocation
without HTTP method or API Gateway context. The IAM operator must independently
review the successful operation in the merchant UI, supply the configured order,
`reviewSource: robokassa-merchant-ui`, and its numeric `providerOperationId`.
The database records `verification_source: manual_merchant_review` and the
provider operation ID. This recovery is not evidence that automatic callbacks work.

OWNER_NOTIFICATION_EMAIL enables a separate owner notification after the
customer message. Answers and the customer's capability link are omitted from
the owner message. The mail timestamp is recorded after both messages have
been accepted by SMTP. Retries after a partial mail failure can repeat the
customer message; SMTP is at-least-once, not exactly-once.

Current implementation still binds a single control order and customer email
server-side. General sales need a separate pre-payment order registry binding
each customer's email, amount and product, plus verified payment initiation.
Do not enable general sales merely because this recovery succeeds.

Private diagnostics `payment-check` and `provider-status` return verification
flags/status codes only; they neither mark orders paid nor send messages.
After a questionnaire is saved, its canonical database record is mailed to
OWNER_NOTIFICATION_EMAIL, including the filled answers. The customer's access
token and its hash are excluded. owner_notified_at is set only after SMTP accepts
that message. Repeated submissions reuse the saved answers and do not replace
them with values from a retry. If mailing fails, the API still confirms storage
with ownerNotified=false; it does not claim that a queue or background retry exists.
Never publish real callback bodies, passwords, customer emails or access tokens
in this repository.
