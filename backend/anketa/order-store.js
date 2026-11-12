'use strict';
const {TypedValues:V,TypedData}=require('ydb-sdk');
const native=result=>TypedData.createNativeObjects(result.resultSets[0]||{})[0];
module.exports=function orderStore(getDriver) {
  async function query(sql,params={}) {const driver=await getDriver();return driver.tableClient.withSessionRetry(session=>session.executeQuery(sql,params));}
  async function get(id) {if(!/^\d{1,19}$/.test(String(id||'')))return undefined;return native(await query('DECLARE $id AS Utf8; SELECT * FROM orders WHERE id=$id;',{'$id':V.utf8(id)}));}
  return {get,
    async create(row) {
      const existing=await get(row.id);if(existing)return existing;
      const strings=['id','request_key','email','product','status','offer_version','privacy_version'];
      const numbers=['amount_minor','created_ms','deadline_ms'];
      const declarations=[...strings.map(k=>`DECLARE $${k} AS Utf8;`),...numbers.map(k=>`DECLARE $${k} AS Uint64;`)];
      const columns=[...strings,...numbers];
      const params=Object.fromEntries([...strings.map(k=>['$'+k,V.utf8(row[k])]),...numbers.map(k=>['$'+k,V.uint64(row[k])])]);
      try {await query(declarations.join('\n')+`INSERT INTO orders (${columns.join(',')},retention_until) VALUES (${columns.map(k=>'$'+k).join(',')},Unwrap(CurrentUtcTimestamp()+Interval("P180D")));`,params);}
      catch(error){const concurrent=await get(row.id);if(concurrent)return concurrent;throw error;}
      return row;
    },
    async paid(id) {await query('DECLARE $id AS Utf8; UPDATE orders SET status="paid",paid_at=COALESCE(paid_at,CurrentUtcTimestamp()) WHERE id=$id;',{'$id':V.utf8(id)});},
    async mark(id,column) {if(!['link_sent_at','owner_order_notified_at'].includes(column))throw Error('invalid_column');await query(`DECLARE $id AS Utf8; UPDATE orders SET ${column}=CurrentUtcTimestamp() WHERE id=$id;`,{'$id':V.utf8(id)});},
    async defer(id) {await query('DECLARE $id AS Utf8; UPDATE orders SET delivery_retry_at=CurrentUtcTimestamp()+Interval("PT5M") WHERE id=$id;',{'$id':V.utf8(id)});},
    async pendingMail() {const r=await query('SELECT * FROM orders WHERE status="paid" AND (link_sent_at IS NULL OR owner_order_notified_at IS NULL) AND (delivery_retry_at IS NULL OR delivery_retry_at<CurrentUtcTimestamp()) LIMIT 1;');return TypedData.createNativeObjects(r.resultSets[0]);}
  };
};
