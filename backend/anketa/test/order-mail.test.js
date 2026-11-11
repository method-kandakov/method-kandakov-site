const {test}=require('node:test');
const assert=require('node:assert/strict');
const messages=[];
require('nodemailer').createTransport=()=>({sendMail:async message=>{messages.push(message);return {accepted:[message.to]};}});
const flow=require('../fulfillment');
test('paid order sends client link and separate owner notice without answers',async()=>{
 await flow.sendQuestionnaire({CONTROL_ORDER_ID:'12345',CONTROL_EMAIL:'buyer@example.com',CONTROL_DEADLINE:String(Date.now()+86400000),TOKEN_PEPPER:'x'.repeat(40),SMTP_HOST:'mail.example.com',SMTP_USER:'owner@example.com',SMTP_PASSWORD:'test',MAIL_FROM:'owner@example.com',OWNER_NOTIFICATION_EMAIL:'owner@example.com'});
 assert.equal(messages.length,2);
 assert.equal(messages[0].to,'buyer@example.com');
 assert.match(messages[0].text,/https:\/\/methodkandakov.com\/anketa-pkch\?order=12345&token=[0-9a-f]{64}/);
 assert.equal(messages[1].to,'owner@example.com');
 assert.match(messages[1].subject,/Новый оплаченный заказ/);
 assert.doesNotMatch(messages[1].text,/token=/);
});
