'use strict';
const crypto = require('node:crypto');
const PRICE_MINOR = 1490000;
const PRODUCTS = Object.freeze({
  pkch: {price: PRICE_MINOR, label: 'ПКЧ', name: 'Персональная Карта Человека', flag: 'PKCH_SALES_ENABLED', questionnaire: '/anketa-pkch'},
  spkch: {price: 4990000, label: 'СПКЧ', name: 'Стратегическая Персональная Карта Человека', flag: 'SPKCH_SALES_ENABLED', questionnaire: '/anketa-spkch'}
});
function product(value) {
  if (!Object.hasOwn(PRODUCTS, value)) throw Error('invalid_checkout');
  return PRODUCTS[value];
}
function validateSubmissionFields(data) {
  if(data.formType==='ПКЧ') {
    if(!data.birthDate||!/^\d{4}-\d{2}-\d{2}$/.test(data.birthDate)||!data.birthTime||!data.birthTimeAccuracy||!data.birthPlace||!data.mainQuestion)throw Error('required_fields');
  } else if(data.formType==='СПКЧ') {
    if(!data.pkchCode||!data.ninetyDayTask)throw Error('required_fields');
  } else throw Error('invalid_form');
}
const ORIGIN = 'https://methodkandakov.com';
const RETENTION_MS = 180 * 86400000;
const equal = (a,b) => {const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y);};
function credentials(env) {
  if (!env.TOKEN_PEPPER || env.TOKEN_PEPPER.length<32 || !env.ROBOKASSA_PASSWORD1 || !env.ROBOKASSA_PASSWORD2 || !['md5','sha256','sha512'].includes(env.ROBOKASSA_HASH)) throw Error('sales_not_configured');
}
function emailAddress(value) {
  const email=String(value||'').trim().toLowerCase();
  if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))throw Error('invalid_email');
  return email;
}
function hmac(value,env) {if(!env.TOKEN_PEPPER||env.TOKEN_PEPPER.length<32)throw Error('sales_not_configured');return crypto.createHmac('sha256',env.TOKEN_PEPPER).update(value).digest('hex');}
function capability(row,purpose,env) {return hmac(JSON.stringify(['pkch-order-v1',purpose,row.id,row.email,row.product,Number(row.deadline_ms)]),env);}
function money(minor) {if(!Number.isSafeInteger(minor)||minor<=0)throw Error('invalid_amount');return (minor/100).toFixed(2);}
function amountMinor(value) {const m=/^(\d{1,10})(?:\.(\d{1,6}))?$/.exec(String(value));if(!m||/[1-9]/.test((m[2]||'').slice(2)))throw Error('invalid_payment');return Number(m[1])*100+Number(((m[2]||'')+'00').slice(0,2));}
function draft(input,env,now=Date.now()) {
  credentials(env);
  const selected=product(input.product);
  if(env[selected.flag]!=='true')throw Error('sales_disabled');
  if(input.acceptOffer!==true||input.acceptPrivacy!==true)throw Error('invalid_checkout');
  if(!/^[a-zA-Z0-9_-]{20,100}$/.test(input.requestKey||''))throw Error('invalid_checkout');
  const email=emailAddress(input.email);
  // Stable identifier for safe client retries; the full request key detects the unlikely ID collision.
  const id=BigInt('0x'+hmac('checkout:'+input.requestKey,env).slice(0,13)).toString();
  return {id,request_key:input.requestKey,email,product:input.product,amount_minor:selected.price,status:'pending',created_ms:now,deadline_ms:now+RETENTION_MS,offer_version:'2026-09-19',privacy_version:'2026-09-19'};
}
function checkout(row,env) {
  credentials(env);
  const selected=product(row.product);
  const out=money(Number(row.amount_minor));
  const statusToken=capability(row,'status',env);
  const statusURL=new URL('/checkout-status.html',ORIGIN);
  statusURL.searchParams.set('order',row.id); statusURL.searchParams.set('key',statusToken);
  const success=statusURL.href;
  const failure=new URL(success); failure.searchParams.set('cancelled','1');
  const receipt=encodeURIComponent(JSON.stringify({items:[{name:selected.name+' ('+selected.label+')',quantity:1,sum:Number(out),payment_method:'full_prepayment',payment_object:'service',tax:'none'}]}));
  const fields={MerchantLogin:env.ROBOKASSA_MERCHANT_LOGIN||'methodkandakov',OutSum:out,InvId:row.id,Description:selected.name+' — заказ №'+row.id,Email:row.email,Culture:'ru',Encoding:'utf-8',Receipt:receipt,SuccessUrl2:success,SuccessUrl2Method:'GET',FailUrl2:failure.href,FailUrl2Method:'GET',Shp_order:row.id,Shp_product:row.product};
  const parts=[fields.MerchantLogin,out,row.id,receipt,success,'GET',failure.href,'GET',env.ROBOKASSA_PASSWORD1,'Shp_order='+row.id,'Shp_product='+row.product];
  fields.SignatureValue=crypto.createHash(env.ROBOKASSA_HASH).update(parts.join(':')).digest('hex');
  return {order:row.id,statusToken,action:'https://auth.robokassa.ru/Merchant/Index.aspx',method:'POST',fields};
}
function verifyCallback(params,row,env) {
  if(!row||!env.ROBOKASSA_PASSWORD2||!['md5','sha256','sha512'].includes(env.ROBOKASSA_HASH))throw Error('invalid_payment');
  for(const key of params.keys())if(params.getAll(key).length!==1)throw Error('invalid_payment');
  if(params.get('IsTest')==='1'||params.get('InvId')!==row.id||params.get('Shp_order')!==row.id||!Object.hasOwn(PRODUCTS,row.product)||params.get('Shp_product')!==row.product||amountMinor(params.get('OutSum'))!==Number(row.amount_minor))throw Error('invalid_payment');
  const extra=[...params.keys()].filter(k=>/^shp_/i.test(k)).sort().map(k=>k+'='+params.get(k));
  const expected=crypto.createHash(env.ROBOKASSA_HASH).update([params.get('OutSum'),row.id,env.ROBOKASSA_PASSWORD2,...extra].join(':')).digest('hex');
  if(!equal((params.get('SignatureValue')||'').toLowerCase(),expected))throw Error('invalid_payment');
  return row;
}
function authorize(row,token,purpose,env,now=Date.now()) {
  if(!row||Number(row.deadline_ms)<=now||!equal(token,capability(row,purpose,env)))throw Error('invalid_token');
  if(purpose==='questionnaire'&&row.status!=='paid')throw Error('invalid_token');
  return row;
}
function questionnaireURL(row,env) {const url=new URL(product(row.product).questionnaire,ORIGIN);url.searchParams.set('order',row.id);url.searchParams.set('token',capability(row,'questionnaire',env));return url.href;}

// Storage and SMTP are injected so orchestration can be tested without real payments or personal records.
function service({store,mail,env=process.env,now=Date.now}) {
  async function create(input,control=false) {
    const selected=product(input.product);
    const proposed=draft(input,control?{...env,[selected.flag]:'true'}:env,now());
    if(control) {
      if(proposed.email!==emailAddress(env.CONTROL_EMAIL))throw Error('invalid_checkout');
      proposed.amount_minor=1000;
      proposed.offer_version='operator-technical-check';
      proposed.privacy_version='operator-technical-check';
    }
    const row=await store.create(proposed);
    if(row.request_key!==proposed.request_key||row.email!==proposed.email||row.product!==proposed.product||Number(row.amount_minor)!==proposed.amount_minor)throw Error('checkout_conflict');
    if(row.status==='paid')return {order:row.id,alreadyPaid:true,statusToken:capability(row,'status',env)};
    return checkout(row,env);
  }
  async function deliver(row) {
    if(row.status!=='paid')throw Error('invalid_payment');
    if(!row.link_sent_at){await mail.sendOrderLink(row,questionnaireURL(row,env));await store.mark(row.id,'link_sent_at');}
    if(!row.owner_order_notified_at){await mail.sendOrderNotice(row);await store.mark(row.id,'owner_order_notified_at');}
  }
  return {
    create:input=>create(input),
    createControl:input=>create(input,true),
    async payment(params) {const row=await store.get(params.get('InvId'));verifyCallback(params,row,env);await store.paid(row.id);await deliver({...row,status:'paid'});return row.id;},
    async status(input) {const row=authorize(await store.get(String(input.order||'')),input.statusToken,'status',env,now());return {order:row.id,paid:row.status==='paid',emailSent:Boolean(row.link_sent_at),...(row.status==='paid'?{questionnaireURL:questionnaireURL(row,env)}:{})};},
    async submission(data) {const row=authorize(await store.get(data.orderNumber),data.accessToken,'questionnaire',env,now());if(data.formType!==product(row.product).label)throw Error('invalid_form');if(data.email!==row.email)throw Error('email_mismatch');return {order:row.id};},
    async retry() {let failed=0;const rows=(await store.pendingMail()).slice(0,1);for(const row of rows){await store.defer(row.id);try{await deliver(row);}catch{failed++;}}return {checked:rows.length,failed};}
  };
}
module.exports={PRICE_MINOR,PRODUCTS,product,validateSubmissionFields,draft,checkout,verifyCallback,capability,authorize,questionnaireURL,amountMinor,service};
