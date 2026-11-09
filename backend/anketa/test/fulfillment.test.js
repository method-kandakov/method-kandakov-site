const {test} = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const flow = require('../fulfillment');
const env = {TOKEN_PEPPER:'a'.repeat(64), CONTROL_ORDER_ID:'12345',CONTROL_EMAIL:'customer@example.com',CONTROL_DEADLINE:String(Date.now()+86400000), ROBOKASSA_PASSWORD2:'test-only-password',ROBOKASSA_HASH:'md5'};
function payment(extra={}) {
  const data = new URLSearchParams({OutSum:'10.000000',InvId:'12345',...extra});
  const fields = [...data.keys()].filter(k=>/^shp_/i.test(k)).sort().map(k=>k+'='+data.get(k));
  data.set('SignatureValue',crypto.createHash('md5').update([data.get('OutSum'),data.get('InvId'),env.ROBOKASSA_PASSWORD2,...fields].join(':')).digest('hex'));
  return data;
}
test('accepts the exact paid control order, binds recipient server-side',()=>{
  assert.equal(flow.verifyPayment(payment({EMail:'attacker@example.com'}),env).email,'customer@example.com');
  assert.equal(flow.verifyPayment(payment({Shp_b:'2',Shp_a:'1'}),env).order,'12345');
});
test('rejects wrong price, order, signature, duplicate keys, and test mode',()=>{
  for(const data of [payment({OutSum:'0.1'}),payment({InvId:'54321'}),payment({IsTest:'1'})])assert.throws(()=>flow.verifyPayment(data,env));
  const tampered=payment();tampered.set('SignatureValue','0'.repeat(32));assert.throws(()=>flow.verifyPayment(tampered,env));
  const duplicate=payment();duplicate.append('InvId','12345');assert.throws(()=>flow.verifyPayment(duplicate,env));
});
test('opaque paid link is bound to order, email, product and deadline',()=>{
  const url=new URL(flow.questionnaireUrl(env));
  const data={formType:'ПКЧ',orderNumber:'12345',email:env.CONTROL_EMAIL,accessToken:url.searchParams.get('token')};
  assert.equal(data.accessToken.length,64);assert.equal(flow.authorizeSubmission(data,env).order,'12345');
  for(const patch of [{accessToken:'b'.repeat(64)},{email:'attacker@example.com'},{orderNumber:'1'},{formType:'СПКЧ'}]) assert.throws(()=>flow.authorizeSubmission({...data,...patch},env));
  assert.throws(()=>flow.authorizeSubmission(data,{...env,CONTROL_DEADLINE:'1'}));
  assert.throws(()=>flow.accessToken({...env,TOKEN_PEPPER:''}));
});
test('payment secrets cannot be absent or use an unsupported hash',()=>{
  assert.throws(()=>flow.verifyPayment(payment(),{...env,ROBOKASSA_PASSWORD2:''}));
  assert.throws(()=>flow.verifyPayment(payment(),{...env,ROBOKASSA_HASH:'sha1'}));
});
