# Automatic PKCH and SPKCH checkout — deployment record

This change replaces the single-recipient binding for new PKCH orders. The existing paid control order and its submitted questionnaire continue to use the legacy path.

## Behavior

- The site collects a buyer email and required checkout acknowledgements. The backend creates a separate immutable email/product/amount record before payment initiation.
- Public PKCH price is fixed server-side at RUB 14,900. Client-provided prices are ignored. The frontend never receives either merchant password.
- Each request has a random idempotency key. Retries reuse the same order; attempts to reassign it to another email are rejected.
- Signed Robokassa initiation includes the receipt, separate return page, and sorted custom order/product parameters.
- Only a valid Result URL signature for a registered order and exact stored amount grants access. Unsigned callback email is ignored.
- Paid status is saved before SMTP. Customer link and owner order notice have separate delivery timestamps, so a failed owner notice does not force another customer email on a provider retry.
- Read-only order status needs a separate capability. It grants questionnaire access only after payment is saved. A return redirect by itself never proves payment.
- Questionnaire tokens bind the order, email, product, deadline and purpose. Existing canonical saved-answer notifications remain unchanged.
- IAM-only recovery handles one pending order or saved questionnaire per invocation, postponing a failed row for five minutes so one recipient does not block all others. SMTP remains at-least-once: simultaneous deliveries can duplicate a notification, but never create another questionnaire or change its recipient.

## Verified production state — 15 November 2026

Current Passwords 1 and 2 are present in the existing Lockbox bindings. Do not request them again or rotate them. PKCH automatic payment, customer questionnaire email, stored submission and owner notification were verified using a real 10 RUB order. Public PKCH sales are enabled. The existing retry timer is already configured; do not create another.

## SPKCH activation

- Backend price is fixed at RUB 49,900. SPKCH uses its own product code, receipt, questionnaire route and form validation. PKCH capability format is unchanged, preserving existing paid links.
- Deploy the updated handler, fulfillment, orders and order-store with existing package files as one function version. Preserve all environment variables, Lockbox bindings, service account, memory, timeout and timer. `SPKCH_SALES_ENABLED` remains false/absent until its real control passes; `PKCH_SALES_ENABLED` stays true.
- IAM-only raw `{"controlDiagnostic":"create-checkout-control","product":"spkch"}` prepares a distinct 10 RUB control bound to CONTROL_EMAIL. It does not charge, accept terms for a customer or confirm payment. The user pays personally. Omitted product retains the original PKCH control behavior.
- Verify provider callback without manual paid override, customer SPKCH link, completed form saved with pkch_code and ninety_day_task, and owner notification. Existing birth fields are required only for PKCH.
- The SPKCH form collects name, email, ready-PKCH code or previous order number, one task for 90 days and consent. The reference supports owner review; this change does not automatically prove a prior PKCH was delivered.
- After that test, set backend `SPKCH_SALES_ENABLED=true` and frontend `checkout.spkchEnabled=true`. Keep public questionnaire gate false. Before activation the SPKCH button routes to contact, avoiding the old static unbound invoice.
- Real final strategy preparation and delivery remain a separate author-reviewed operation. Do not claim automated strategy generation or that all products are ready.
- PRIVATE still requires task agreement before payment; CLUB remains unchanged.

## Validation

Automated tests cover two independent buyers, idempotent retries, fixed server price, signature construction, forged/wrong-amount/test/duplicate callbacks, unsigned-email tampering, paid-only capabilities, mail failures and retries, expired tokens, and preservation of the legacy control scenario.

Official integration references:
- https://docs.robokassa.ru/ru/pay-interface
- https://docs.robokassa.ru/ru/notifications-and-redirects

Fiscal receipt compatibility with this self-employed merchant must be confirmed during the real provider test; do not infer it solely from a mocked request.


## Issued PKCH registry

Apply `issued-cards-schema.sql` before deploying reference lookup. Keep the function private. After confirmed final-card delivery invoke IAM-only raw diagnostic `{controlDiagnostic:"register-issued-pkch",order:"<paid PKCH order>",deliveryProof:"owner-confirmed-delivery"}`. The returned random code must be included in the delivered card; pass an already delivered legacy `code` when backfilling confirmed delivery. Registration timestamp means operator confirmation time. Never register merely because the questionnaire link was sent. Retries reuse the same code; INSERT prevents reassignment.

SPKCH reference checks require a paid questionnaire capability, buyer email, and an unexpired delivered paid PKCH with the same email. Canonical code, legacy eight-digit shorthand, and source order number are accepted. Public response contains only valid:true, never private card data. Submission rechecks and stores canonical pkch_code. Existing submissions are not rewritten. Different-email purchases require operator review. Registry TTL follows source-order retention. Final card generation and delivery are not automated by this registry.
