const {test} = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const flow = require('../fulfillment');
test('provider status signs the server-bound order and parses explicit success only',async()=>{
 const env={CONTROL_ORDER_ID:'12345',CONTROL_EMAIL:'test@example.com',CONTROL_DEADLINE:String(Date.now()+60000),TOKEN_PEPPER:'x'.repeat(40),ROBOKASSA_MERCHANT_LOGIN:'test-shop',ROBOKASSA_PASSWORD2:'test-key',ROBOKASSA_HASH:'sha256'};
 const original=global.fetch;
 try {
  global.fetch=async(url,options)=>{
   assert.equal(url,'https://auth.robokassa.ru/Merchant/WebService/Service.asmx/OpStateExt');
   assert.equal(options.method,'POST');
   assert.equal(options.body.get('InvoiceID'),'12345');
   assert.equal(options.body.get('Signature'),crypto.createHash('sha256').update('test-shop:12345:test-key').digest('hex'));
   return {status:200,text:async()=>'<OperationStateResponse><Result><Code>0</Code></Result><State><Code>100</Code></State><Info><OutSum>10.000000</OutSum></Info></OperationStateResponse>'};
  };
  assert.deepEqual(await flow.providerStatus(env),{httpStatus:200,resultCode:'0',stateCode:'100',amountMatches:true});
  global.fetch=async()=>({status:200,text:async()=>'<OperationStateResponse><Result><Code>1</Code></Result></OperationStateResponse>'});
  assert.deepEqual(await flow.providerStatus(env),{httpStatus:200,resultCode:'1',stateCode:'',amountMatches:false});
 } finally {global.fetch=original;}
});
