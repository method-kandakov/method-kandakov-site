'use strict';
const crypto=require('node:crypto');
function referenceKey(value) {
  const code=String(value||'').trim().toUpperCase();
  if(/^\d{1,19}$/.test(code))return 'ORDER:'+code;
  if(!/^PKCH-[A-Z0-9-]{6,80}$/.test(code))throw Error('invalid_pkch_reference');
  return code;
}
function issuedCards({store,now=Date.now}) {
  async function resolve(reference,email) {
    let card=await store.findIssuedCard(referenceKey(reference));
    // Older delivered cards display four two-digit groups; accept their compact form.
    const compact=String(reference||'').trim();
    if(!card&&/^\d{8}$/.test(compact))card=await store.findIssuedCard('PKCH-'+compact.match(/.{2}/g).join('-'));
    if(!card||!card.delivery_confirmed_at||Number(card.deadline_ms)<=now()||card.email!==email)throw Error('invalid_pkch_reference');
    const order=await store.get(card.order_id);
    if(!order||order.status!=='paid'||order.product!=='pkch'||order.email!==email||Number(order.deadline_ms)<=now())throw Error('invalid_pkch_reference');
    return {pkchCode:card.code,pkchOrderId:card.order_id};
  }
  async function register(input) {
    if(input.deliveryProof!=='owner-confirmed-delivery')throw Error('invalid_delivery_proof');
    const row=await store.get(String(input.order||''));
    if(!row||row.status!=='paid'||row.product!=='pkch'||Number(row.deadline_ms)<=now())throw Error('invalid_pkch_reference');
    const existing=await store.findIssuedCard('ORDER:'+row.id);
    if(existing) {
      if(existing.order_id!==row.id||existing.email!==row.email||(input.code&&referenceKey(input.code)!==existing.code))throw Error('registry_conflict');
      return {code:existing.code,order:row.id};
    }
    const code=input.code?referenceKey(input.code):'PKCH-'+crypto.randomBytes(16).toString('hex').toUpperCase();
    if(!code.startsWith('PKCH-'))throw Error('invalid_pkch_reference');
    const occupied=await store.findIssuedCard(code);
    if(occupied)throw Error('registry_conflict');
    await store.registerIssuedCard({code,order_id:row.id,email:row.email,deadline_ms:Number(row.deadline_ms)});
    return {code,order:row.id};
  }
  return {resolve,register};
}
module.exports={referenceKey,issuedCards};
