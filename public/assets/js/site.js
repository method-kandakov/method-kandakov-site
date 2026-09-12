
(() => {
  const CFG = window.KANDAKOV_CONFIG || {};
  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];

  qsa("[data-year]").forEach(el => el.textContent = new Date().getFullYear());

  // Keep the cookie policy reachable from every page that uses the shared footer.
  qsa(".footer-links").forEach(links => {
    if (!qs('a[href="cookies.html"]', links)) {
      const clubTerms = qs('a[href="club-terms.html"]', links);
      const cookieLink = document.createElement("a");
      cookieLink.href = "cookies.html";
      cookieLink.textContent = "Политика использования cookie";
      links.insertBefore(cookieLink, clubTerms || null);
    }
  });

  // The current site stores only the acknowledgement below in localStorage.
  // Analytics and advertising tools must not be loaded unless a separate
  // opt-in choice is implemented.
  const cookieChoiceKey = "mk_cookie_notice_v1";
  if (!localStorage.getItem(cookieChoiceKey)) {
    const notice = document.createElement("section");
    notice.className = "cookie-notice";
    notice.setAttribute("aria-label", "Уведомление об использовании cookie");
    notice.innerHTML = `
      <div>
        <strong>Технические данные</strong>
        <p>Сайт сохраняет на устройстве только отметку о закрытии этого уведомления. Рекламная и аналитическая слежка не используется.</p>
      </div>
      <div class="cookie-actions">
        <a href="cookies.html">Подробнее</a>
        <button type="button" class="btn btn-gold" data-cookie-accept>Понятно</button>
      </div>`;
    document.body.appendChild(notice);
    qs("[data-cookie-accept]", notice).addEventListener("click", () => {
      localStorage.setItem(cookieChoiceKey, "acknowledged");
      notice.remove();
    });
  }

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

  // Checkout shell. Until online payment is connected, it routes the user to
  // direct contact without collecting personal data on this site.
  const layer = document.createElement("div");
  layer.className = "checkout-layer";
  layer.innerHTML = `
    <div class="checkout-backdrop" data-checkout-close></div>
    <div class="checkout-card" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
      <button class="checkout-close" data-checkout-close type="button" aria-label="Закрыть">×</button>
      <div class="eyebrow">Оформление запроса</div>
      <h3 id="checkout-title">Заказ</h3>
      <div class="checkout-price" id="checkout-price"></div>
      <label class="checkline">
        <input type="checkbox" id="accept-offer">
        <span>Я принимаю <a href="offer.html" target="_blank" rel="noopener">Публичную оферту</a>.</span>
      </label>
      <label class="checkline">
        <input type="checkbox" id="accept-pd">
        <span>Я ознакомлен(а) с <a href="privacy.html" target="_blank" rel="noopener">Политикой обработки персональных данных</a>. Отдельное согласие будет зафиксировано при заполнении анкеты.</span>
      </label>
      <div class="checkout-note" id="recurring-note"></div>
      <button class="btn btn-gold" id="checkout-go" type="button" aria-disabled="true">Перейти к оформлению</button>
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

  let current = null;
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
      offer.checked = false;
      pd.checked = false;
      updateGo();
      msg.classList.remove("show");
      msg.textContent = "";
      recurring.textContent = btn.dataset.recurring === "true"
        ? "Ежемесячное участие оформляется только после отдельного явного согласия с суммой, периодичностью и условиями автопродления."
        : "После оформления Александр Кандаков свяжется с вами для подтверждения запроса и получения необходимых данных.";
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
    const telegram = CFG.contacts?.telegram || "https://t.me/alexandr_kandakov";
    const email = CFG.contacts?.email || "mailto:info@methodkandakov.com";
    msg.innerHTML = `Для оформления напишите Александру Кандакову через <a href="${telegram}" style="color:#f0d078;text-decoration:underline">Telegram</a> или <a href="${email}" style="color:#f0d078;text-decoration:underline">email</a>.`;
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
