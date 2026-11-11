'use strict';
const crypto = require('node:crypto');

function secureEqual(a, b) {
  const left = Buffer.from(String(a)), right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
function settings(env = process.env) {
  const order = env.CONTROL_ORDER_ID || '';
  const email = (env.CONTROL_EMAIL || '').trim().toLowerCase();
  const deadline = Number(env.CONTROL_DEADLINE || 0);
  if (!/^\d+$/.test(order) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !Number.isSafeInteger(deadline) || deadline <= Date.now() ||
      !env.TOKEN_PEPPER || env.TOKEN_PEPPER.length < 32) throw new Error('control_not_configured');
  return { order, email, deadline };
}
function accessToken(env = process.env) {
  const { order, email, deadline } = settings(env);
  return crypto.createHmac('sha256', env.TOKEN_PEPPER)
    .update(`pkch-control-v1:${order}:${email}:${deadline}`).digest('hex');
}
function authorizeSubmission(data, env = process.env) {
  const control = settings(env);
  if (data.formType !== 'ПКЧ' || data.orderNumber !== control.order ||
      data.email !== control.email || !secureEqual(data.accessToken, accessToken(env))) {
    throw new Error('invalid_token');
  }
  return control;
}
function verifyPayment(params, env = process.env) {
  const control = settings(env);
  if (!env.ROBOKASSA_PASSWORD2 || !['md5', 'sha256', 'sha512'].includes(env.ROBOKASSA_HASH)) {
    throw new Error('payment_not_configured');
  }
  // Reject duplicate form keys rather than silently verifying one of them.
  for (const key of params.keys()) if (params.getAll(key).length !== 1) throw new Error('invalid_payment');
  const amount = params.get('OutSum') || '';
  const order = params.get('InvId') || '';
  const signature = params.get('SignatureValue') || '';
  if (!/^10(?:\.0{1,6})?$/.test(amount) || order !== control.order || params.get('IsTest') === '1') {
    throw new Error('invalid_payment');
  }
  const extra = [...params.keys()].filter(key => /^shp_/i.test(key)).sort()
    .map(key => `${key}=${params.get(key)}`);
  const input = [amount, order, env.ROBOKASSA_PASSWORD2, ...extra].join(':');
  const expected = crypto.createHash(env.ROBOKASSA_HASH).update(input).digest('hex');
  if (!/^[0-9a-f]+$/i.test(signature) || !secureEqual(signature.toLowerCase(), expected)) {
    throw new Error('invalid_payment');
  }
  // Recipient is bound server-side. EMail in a callback is not covered by its signature.
  return control;
}
function questionnaireUrl(env = process.env) {
  const control = settings(env);
  const url = new URL('https://methodkandakov.com/anketa-pkch');
  url.searchParams.set('order', control.order);
  url.searchParams.set('token', accessToken(env));
  return url.href;
}
function diagnosePayment(raw, env = process.env) {
  const p = new URLSearchParams(raw);
  const c = settings(env);
  const amount = p.get('OutSum') || '', order = p.get('InvId') || '';
  const signature = (p.get('SignatureValue') || '').toLowerCase();
  const extra = [...p.keys()].filter(k => /^shp_/i.test(k)).sort().map(k => `${k}=${p.get(k)}`);
  const matches = extras => secureEqual(signature, crypto.createHash(env.ROBOKASSA_HASH).update([amount, order, env.ROBOKASSA_PASSWORD2, ...extras].join(':')).digest('hex'));
  return {amountValid:/^10(?:\.0{1,6})?$/.test(amount),orderMatches:order===c.order,signatureMatches:matches(extra),signatureWithoutExtras:matches([]),hash:env.ROBOKASSA_HASH,duplicateKeys:[...p.keys()].some(k=>p.getAll(k).length!==1)};
}
async function providerStatus(env = process.env) {
  const control = settings(env);
  const merchant = env.ROBOKASSA_MERCHANT_LOGIN || 'methodkandakov';
  const signature = crypto.createHash(env.ROBOKASSA_HASH).update([merchant,control.order,env.ROBOKASSA_PASSWORD2].join(':')).digest('hex');
  const result = await fetch('https://auth.robokassa.ru/Merchant/WebService/Service.asmx/OpStateExt', {
    method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({MerchantLogin:merchant,InvoiceID:control.order,Signature:signature}),
    signal:AbortSignal.timeout(15000)
  });
  const xml = await result.text();
  const field = (section,tag) => {
    const block=xml.match(new RegExp('<'+section+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+section+'>'))?.[1] || '';
    return block.match(new RegExp('<'+tag+'(?:\\s[^>]*)?>([^<]*)</'+tag+'>'))?.[1] || '';
  };
  return {httpStatus:result.status,resultCode:field('Result','Code'),stateCode:field('State','Code'),amountMatches:/^10(?:\.0{1,6})?$/.test(field('Info','OutSum'))};
}
function mailer(env = process.env) {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD || !env.MAIL_FROM) {
    throw new Error('mail_not_configured');
  }
  const nodemailer = require('nodemailer');
  return nodemailer.createTransport({
    host: env.SMTP_HOST, port: 465, secure: true,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
  });
}
async function sendQuestionnaire(env = process.env) {
  const control = settings(env);
  const result = await mailer(env).sendMail({
    from: env.MAIL_FROM, to: control.email,
    messageId: `<pkch-control-${control.order}@methodkandakov.com>`,
    subject: 'Контрольный заказ ПКЧ: ваша персональная анкета',
    text: `Оплата контрольного заказа №${control.order} подтверждена.\n\nЗаполните анкету по персональной ссылке:\n${questionnaireUrl(env)}\n\nНе пересылайте эту ссылку другим людям. После отправки анкеты сайт покажет номер принятой анкеты. Это техническая проверка пути заказа.\n\nМетод Кандакова`
  });
  if (!result.accepted?.some(address => String(address).toLowerCase() === control.email)) {
    throw new Error('mail_not_accepted');
  }
}
module.exports = { secureEqual, settings, accessToken, authorizeSubmission, verifyPayment, diagnosePayment, providerStatus, questionnaireUrl, sendQuestionnaire, verifyMailer: async () => mailer().verify() };

