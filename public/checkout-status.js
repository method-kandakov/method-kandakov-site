'use strict';
(() => {
  const query=new URLSearchParams(location.search),order=query.get('order'),key=query.get('key');
  const title=document.getElementById('title'),message=document.getElementById('message'),button=document.getElementById('check'),link=document.getElementById('questionnaire');
  document.getElementById('order').textContent=order||'—';
  let polls=0,timer;
  async function check(){
    clearTimeout(timer);
    if(!/^\d{1,19}$/.test(order||'')||!/^[a-f0-9]{64}$/.test(key||'')){title.textContent='Откройте страницу из вашего заказа';message.textContent='Здесь нет данных для безопасной проверки. Персональная ссылка на анкету также придёт на почту после подтверждения оплаты.';button.hidden=true;return;}
    button.disabled=true;
    try {
      const response=await fetch(window.KANDAKOV_CONFIG.checkout.endpoint+'?action=status',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({order,statusToken:key})});
      const result=await response.json();if(!response.ok||!result.ok)throw Error('unavailable');
      if(result.paid){title.textContent='Оплата подтверждена';message.textContent=result.emailSent?'Персональная ссылка на анкету отправлена на указанную при заказе почту. Можно открыть её и здесь.':'Можно заполнить анкету сейчас. Письмо с персональной ссылкой ещё отправляется.';
        const url=new URL(result.questionnaireURL);if(url.origin!=='https://methodkandakov.com'||url.pathname!=='/anketa-pkch')throw Error('invalid_link');link.href=url.href;link.hidden=false;button.hidden=true;return;}
      title.textContent='Ожидаем подтверждение оплаты';message.textContent='Если вы уже оплатили, не платите повторно. Дождитесь подтверждения или проверьте почту.';
    }catch{title.textContent='Не удалось проверить заказ';message.textContent='Попробуйте проверить ещё раз. Не оплачивайте заказ повторно, если деньги уже списались.';}
    finally{button.disabled=false;}
    if(++polls<12)timer=setTimeout(check,5000);
  }
  button.addEventListener('click',()=>{polls=0;check();});check();
})();
