
(() => {
  const CFG = window.KANDAKOV_CONFIG || {};
  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];

  qsa("[data-year]").forEach(el => el.textContent = new Date().getFullYear());

  // Mobile menu
  const menuBtn = qs(".menu-btn");
  const desktopNav = qs(".desktop-nav");
  if (menuBtn && desktopNav) {
    const drawer = document.createElement("div");
    drawer.className = "mobile-drawer";
    drawer.innerHTML = `
      <div class="drawer-backdrop" data-menu-close></div>
      <aside class="drawer-panel" aria-label="Мобильное меню">
        <button class="drawer-close" type="button" data-menu-close aria-label="Закрыть меню">×</button>
        <a class="drawer-brand" href="index.html">
          <span class="logo-shell"><img src="assets/img/logo.png" alt=""></span>
          <span><strong>МЕТОД КАНДАКОВА</strong><small>ОФИЦИАЛЬНЫЙ САЙТ</small></span>
        </a>
        <nav class="drawer-links">${desktopNav.innerHTML}</nav>
      </aside>`;
    document.body.appendChild(drawer);
    const closeMenu = () => document.body.classList.remove("menu-open");
    menuBtn.addEventListener("click", () => document.body.classList.add("menu-open"));
    qsa("[data-menu-close]", drawer).forEach(el => el.addEventListener("click", closeMenu));
    qsa("a", drawer).forEach(el => el.addEventListener("click", closeMenu));
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });
  }

  // Checkout modal for PKCH / SPKCH / CLUB.
  const layer = document.createElement("div");
  layer.className = "checkout-layer";
  layer.innerHTML = `
    <div class="checkout-backdrop" data-checkout-close></div>
    <div class="checkout-card" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
      <button class="checkout-close" data-checkout-close type="button" aria-label="Закрыть">×</button>
      <div class="eyebrow">Оформление</div>
      <h3 id="checkout-title">Заказ</h3>
      <div class="checkout-price" id="checkout-price"></div>
      <label class="checkline">
        <input type="checkbox" id="accept-offer">
        <span>Я принимаю <a href="offer.html" target="_blank" rel="noopener">Публичную оферту</a>.</span>
      </label>
      <label class="checkline">
        <input type="checkbox" id="accept-pd">
        <span>Я даю <a href="consent.html" target="_blank" rel="noopener">согласие на обработку персональных данных</a> и ознакомлен(а) с <a href="privacy.html" target="_blank" rel="noopener">Политикой ПД</a>.</span>
      </label>
      <div class="checkout-note" id="recurring-note"></div>
      <button class="btn btn-gold" id="checkout-go" type="button" aria-disabled="true">Перейти к оплате</button>
      <div class="checkout-message" id="checkout-message"></div>
    </div>`;
  document.body.appendChild(layer);

  const title = qs("#checkout-title", layer);
  const price = qs("#checkout-price", layer);
  const offer = qs("#accept-offer", layer);
  const pd = qs("#accept-pd", layer);
  const recurring = qs("#recurring-note", layer);
  const go = qs("#checkout-go", layer);
  const msg = qs("#checkout-message", layer);
  let current = null;

  const paymentMap = () => ({
    pkch: CFG.prodamus?.pkch || "",
    spkch: CFG.prodamus?.spkch || "",
    clubMonthly: CFG.prodamus?.clubMonthly || "",
    clubAnnual: CFG.prodamus?.clubAnnual || ""
  });

  function updateGo(){
    const ok = offer.checked && pd.checked;
    go.setAttribute("aria-disabled", ok ? "false" : "true");
  }
  offer.addEventListener("change", updateGo);
  pd.addEventListener("change", updateGo);

  function closeCheckout(){
    layer.classList.remove("open");
    document.body.classList.remove("modal-open");
    current = null;
  }
  qsa("[data-checkout-close]", layer).forEach(el => el.addEventListener("click", closeCheckout));

  qsa("[data-checkout]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      current = btn.dataset.checkout;
      title.textContent = btn.dataset.title || "Оформление";
      price.textContent = btn.dataset.price || "";
      offer.checked = false; pd.checked = false; updateGo();
      msg.classList.remove("show"); msg.textContent = "";
      recurring.textContent = btn.dataset.recurring === "true"
        ? "Нажимая «Перейти к оплате», вы переходите в платёжную форму. Для ежемесячного CLUB условия автосписания, периодичность и возможность отключения будущих списаний должны быть явно указаны в подключённой подписке Prodamus."
        : "После подтверждения оплаты следующий шаг предоставляется в соответствии с условиями выбранного продукта.";
      layer.classList.add("open");
      document.body.classList.add("modal-open");
    });
  });

  go.addEventListener("click", () => {
    if (go.getAttribute("aria-disabled") === "true") return;
    const link = paymentMap()[current] || "";
    if (link) {
      window.location.href = link;
      return;
    }
    msg.innerHTML = `Онлайн-оформление этого продукта сейчас завершается. Для оформления можно написать в <a href="${CFG.contacts?.telegram || "https://t.me/alexandr_kandakov"}" style="color:#f0d078;text-decoration:underline">Telegram</a> или на <a href="${CFG.contacts?.email || "mailto:info@methodkandakov.com"}" style="color:#f0d078;text-decoration:underline">email</a>.`;
    msg.classList.add("show");
  });

  // Optional Prodamus widget loader. No public secret keys are used.
  if (CFG.prodamusWidgetBaseUrl) {
    const base = String(CFG.prodamusWidgetBaseUrl).replace(/\/+$/,"");
    const script = document.createElement("script");
    script.src = base + "/widget.js";
    script.async = true;
    document.body.appendChild(script);
  }
})();
