
const C = window.KANDAKOV || {};
document.querySelectorAll("[data-year]").forEach(e=>e.textContent=new Date().getFullYear());
document.querySelectorAll("[data-email]").forEach(e=>{e.textContent=C.brand.email;e.href="mailto:"+C.brand.email});
document.querySelectorAll("[data-telegram]").forEach(e=>{e.textContent=C.brand.telegramUser;e.href=C.brand.telegramUrl});
document.querySelectorAll("[data-telegram-link]").forEach(e=>e.href=C.brand.telegramUrl);
document.querySelectorAll("[data-inn]").forEach(e=>e.textContent=C.brand.inn);
document.querySelectorAll("[data-executor]").forEach(e=>e.textContent=C.brand.executor);

const values = {
  "spkch-price": C.products.spkch.price,
  "private-price": C.products.private.price,
  "club-month": C.products.club.monthPrice,
  "club-year": C.products.club.yearPrice
};
Object.entries(values).forEach(([k,v])=>document.querySelectorAll(`[data-${k}]`).forEach(e=>e.textContent=v));

function pay(key, fallback=C.brand.telegramUrl){
  const map={
    pkch:C.products.pkch.paymentUrl,
    spkch:C.products.spkch.paymentUrl,
    clubMonth:C.products.club.monthPaymentUrl,
    clubYear:C.products.club.yearPaymentUrl
  };
  return map[key] || fallback;
}
document.querySelectorAll("[data-pay]").forEach(a=>a.href=pay(a.dataset.pay));
const h=document.querySelector(".hamb");if(h)h.onclick=()=>{const n=document.querySelector("nav");n.style.display=n.style.display==="flex"?"none":"flex"};
