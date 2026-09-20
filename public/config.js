/*
METHOD KANDAKOV — EDITABLE CONFIGURATION
Only this file needs changing when payment/contact infrastructure is finalized.

IMPORTANT:
- Do NOT put Prodamus secret keys in a public website.
- Put only public payment/subscription links here.
- PRIVATE intentionally has no public payment link.
*/

window.KANDAKOV_CONFIG = {
  contacts: {
    telegram: "https://t.me/alexandr_kandakov",
    email: "mailto:info@methodkandakov.com"
  },

  // Public Prodamus payment links.
  // Leave "" until the real links are created in the Prodamus account.
  prodamus: {
    pkch: "https://link.payform.ru/?paymentLinkId=baa7263e-a685-4b8c-809e-a71018ef144e",
    spkch: "",
    clubMonthly: "",
    clubAnnual: ""
  },

  // Optional Prodamus widget domain, for example:
  // "https://yourname.payform.ru"
  // The site works without the widget and can use direct payment links above.
  prodamusWidgetBaseUrl: "",

  questionnaires: {
    endpoint: "https://d5dsri43hgg76pqk7l61.nnekmrav.apigw.yandexcloud.net/submit",
    enabled: false,
    consentVersion: "2026-09-19",
    privacyVersion: "2026-09-19"
  }
};

/*
FINAL COMMERCIAL CONNECTION NOTE
The public site is ready before Prodamus is connected.
When Prodamus issues the public payment links, fill ONLY:
  prodamus.pkch
  prodamus.spkch
  prodamus.clubMonthly
  prodamus.clubAnnual
PRIVATE intentionally stays without a public checkout.
Never place Prodamus secret keys in this public file.
*/
