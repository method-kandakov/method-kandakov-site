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

  // Public payment links. Empty links safely fall back to direct contact.
  payments: {
    pkch: "https://auth.robokassa.ru/merchant/Invoice/HAoSQvJkL0mwfVCRV0zO3A",
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
PKCH uses the approved public Robokassa checkout link above.
Other products remain empty until their checkout is approved.
PRIVATE intentionally stays without a public checkout.
Never place secret keys or bank account details in this public file.
*/
