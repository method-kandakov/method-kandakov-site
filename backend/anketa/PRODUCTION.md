# Automatic PKCH checkout — deployment record

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

## Mandatory activation steps

1. Obtain CURRENT existing merchant Passwords 1 and 2 through the authenticated support thread. On 12 November support confirmed Password 2 changed before the previous payment and is no longer the value they previously supplied. Do not rotate credentials or reuse the obsolete value.
2. Store current values in Lockbox; keep them out of Git, terminal arguments, screenshots and handoff documents. Add ROBOKASSA_PASSWORD1 to the function's existing secret bindings. Retain SHA256 matching merchant settings.
3. Apply orders-schema.sql in the existing ru-central1 YDB. Check the real query types, including required retention_until. Do not insert invented questionnaire answers.
4. Deploy handler.js, fulfillment.js, orders.js, order-store.js and existing package files as one function version. Keep PKCH_SALES_ENABLED=false and frontend checkout.enabled=false until the automatic real test passes.
5. IAM raw create-checkout-control creates a separate 10 RUB technical checkout for CONTROL_EMAIL using existing keys, even while public sales are disabled. The row records operator-technical-check, not customer acceptance. It does not charge, confirm payment, or submit a questionnaire. The user completes payment personally.
6. Verify the real provider payment callback (without manual paid override), receipt, customer email link, questionnaire storage and owner email. Verify a second address/order using staging/mocks first and a separate authorized real test if required. Wrong signatures and amounts must still be rejected.
7. Configure an IAM timer each minute before general activation. The handler recognizes the documented yandex.cloud.events.serverless.triggers.TimerMessage event, only for raw IAM calls. Confirm the function invocation account. Do not publish a retry endpoint.
8. Publish the status page and checkout changes. Only then set PKCH_SALES_ENABLED=true and checkout.enabled=true. Inspect a fresh browser's checkout, return status and mobile email field. Preserve other product flows.

## External blocker as of 12 November 2026

Current merchant passwords are awaited in the existing Robokassa support thread (11 comments, reopened). Code tests are not proof of a successful automatic real payment. This branch must not be described as an already enabled production checkout.

## Validation

Automated tests cover two independent buyers, idempotent retries, fixed server price, signature construction, forged/wrong-amount/test/duplicate callbacks, unsigned-email tampering, paid-only capabilities, mail failures and retries, expired tokens, and preservation of the legacy control scenario.

Official integration references:
- https://docs.robokassa.ru/ru/pay-interface
- https://docs.robokassa.ru/ru/notifications-and-redirects

Fiscal receipt compatibility with this self-employed merchant must be confirmed during the real provider test; do not infer it solely from a mocked request.
