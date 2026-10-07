/*
METHOD KANDAKOV — EDITABLE CONFIGURATION
Only this file needs changing when payment/contact infrastructure is finalized.

IMPORTANT:
- Do NOT put payment-system secret keys or bank details in a public website.
- Put only public payment/subscription links here.
- PRIVATE intentionally has no public payment link.
*/

window.KANDAKOV_CONFIG = {
  contacts: {
    telegram: "https://t.me/alexandr_kandakov",
    email: "mailto:info@methodkandakov.com"
  },

  // Public payment links. PKCH will receive its Robokassa link after the
  // store is activated. Empty links safely fall back to direct contact.
  payments: {
    pkch: "",
    spkch: "",
    clubMonthly: "",
    clubAnnual: ""
  },

  questionnaires: {
    endpoint: "https://d5dsri43hgg76pqk7l61.nnekmrav.apigw.yandexcloud.net/submit",
    enabled: false,
    consentVersion: "2026-09-19",
    privacyVersion: "2026-09-19"
  }
};

/*
FINAL COMMERCIAL CONNECTION NOTE
The public site is ready before a payment provider is connected.
When Robokassa issues the public payment link for PKCH, fill ONLY:
  payments.pkch
Other products remain empty until their checkout is approved.
PRIVATE intentionally stays without a public checkout.
Never place secret keys or bank account details in this public file.
*/
