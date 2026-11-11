const crypto = require('crypto');
const { Driver, getCredentialsFromEnv, TypedValues } = require('ydb-sdk');

const ALLOWED_ORIGIN = 'https://methodkandakov.com';
const fulfillment = require('./fulfillment');
const MAX_BODY_BYTES = 20 * 1024;
let driverPromise;

function response(statusCode, body, origin = ALLOWED_ORIGIN) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    },
    body: body === null ? '' : JSON.stringify(body)
  };
}

function text(value, max) {
  if (value == null) return '';
  const normalized = String(value).trim();
  if (normalized.length > max) throw new Error('invalid_field');
  return normalized;
}

function parseBody(event) {
  const raw = event && event.body;
  if (raw == null) return {};
  if (typeof raw === 'object') return raw;
  const decoded = event.isBase64Encoded ? Buffer.from(raw, 'base64').toString('utf8') : String(raw);
  if (Buffer.byteLength(decoded, 'utf8') > MAX_BODY_BYTES) throw new Error('body_too_large');
  return JSON.parse(decoded);
}

async function getDriver() {
  if (!driverPromise) {
    driverPromise = (async () => {
      const endpoint = process.env.YDB_ENDPOINT;
      const database = process.env.YDB_DATABASE;
      if (!endpoint || !database) throw new Error('database_not_configured');
      const driver = new Driver({ endpoint, database, authService: getCredentialsFromEnv() });
      if (!(await driver.ready(10000))) throw new Error('database_unavailable');
      return driver;
    })();
  }
  return driverPromise;
}

function validate(data) {
  const formType = text(data.formType, 10).toUpperCase();
  if (!['ПКЧ', 'СПКЧ'].includes(formType)) throw new Error('invalid_form');
  const name = text(data.name, 120);
  const email = text(data.email, 254).toLowerCase();
  const consent = data.consent === true || data.consent === 'yes';
  const accessToken = text(data.accessToken, 256);
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || !consent) throw new Error('required_fields');
  if (accessToken.length < 32) throw new Error('invalid_token');
  const common = {
    formType, name, email, accessToken,
    product: text(data.product || formType, 80),
    orderNumber: text(data.orderNumber, 120),
    consentVersion: text(data.consentVersion || '2026-09-15', 40),
    privacyVersion: text(data.privacyVersion || '2026-09-15', 40)
  };
  if (formType === 'ПКЧ') return {
    ...common,
    birthDate: text(data.birthDate, 10),
    birthTime: text(data.birthTime, 16),
    birthTimeAccuracy: text(data.birthTimeAccuracy, 80),
    birthPlace: text(data.birthPlace, 300),
    mainQuestion: text(data.mainQuestion, 700)
  };
  return {
    ...common,
    pkchCode: text(data.pkchCode, 120),
    ninetyDayTask: text(data.ninetyDayTask, 700)
  };
}

async function saveSubmission(data) {
  const pepper = process.env.TOKEN_PEPPER;
  if (!pepper || pepper.length < 32) throw new Error('token_security_not_configured');
  const id = 'control-' + crypto.createHmac('sha256', pepper).update('submission:' + data.orderNumber).digest('hex').slice(0, 32);
  const tokenHash = crypto.createHmac('sha256', pepper).update(data.accessToken).digest();
  const commonParams = {
    '$id': TypedValues.utf8(id),
    '$form_type': TypedValues.utf8(data.formType),
    '$status': TypedValues.utf8('received'),
    '$name': TypedValues.utf8(data.name),
    '$email': TypedValues.utf8(data.email),
    '$product': TypedValues.utf8(data.product),
    '$order_number': TypedValues.utf8(data.orderNumber),
    '$access_token_hash': TypedValues.bytes(tokenHash),
    '$consent_version': TypedValues.utf8(data.consentVersion),
    '$privacy_version': TypedValues.utf8(data.privacyVersion)
  };

  let query;
  let params;
  if (data.formType === 'ПКЧ') {
    query = `
      DECLARE $id AS Utf8; DECLARE $form_type AS Utf8; DECLARE $status AS Utf8;
      DECLARE $name AS Utf8; DECLARE $email AS Utf8; DECLARE $birth_date AS Utf8;
      DECLARE $birth_time AS Utf8; DECLARE $birth_time_accuracy AS Utf8;
      DECLARE $birth_place AS Utf8; DECLARE $main_question AS Utf8;
      DECLARE $product AS Utf8; DECLARE $order_number AS Utf8;
      DECLARE $access_token_hash AS String; DECLARE $consent_version AS Utf8;
      DECLARE $privacy_version AS Utf8;
      INSERT INTO submissions (
        id, form_type, status, name, email, birth_date, birth_time,
        birth_time_accuracy, birth_place, main_question, product, order_number,
        access_token_hash, consent_version, privacy_version, created_at,
        updated_at, retention_until
      ) VALUES (
        $id, $form_type, $status, $name, $email, CAST($birth_date AS Date),
        $birth_time, $birth_time_accuracy, $birth_place, $main_question,
        $product, $order_number, $access_token_hash, $consent_version,
        $privacy_version, CurrentUtcTimestamp(), CurrentUtcTimestamp(),
        CurrentUtcTimestamp() + Interval("P180D")
      );
    `;
    params = {
      ...commonParams,
      '$birth_date': TypedValues.utf8(data.birthDate),
      '$birth_time': TypedValues.utf8(data.birthTime),
      '$birth_time_accuracy': TypedValues.utf8(data.birthTimeAccuracy),
      '$birth_place': TypedValues.utf8(data.birthPlace),
      '$main_question': TypedValues.utf8(data.mainQuestion)
    };
  } else {
    query = `
      DECLARE $id AS Utf8; DECLARE $form_type AS Utf8; DECLARE $status AS Utf8;
      DECLARE $name AS Utf8; DECLARE $email AS Utf8; DECLARE $pkch_code AS Utf8;
      DECLARE $ninety_day_task AS Utf8; DECLARE $product AS Utf8;
      DECLARE $order_number AS Utf8; DECLARE $access_token_hash AS String;
      DECLARE $consent_version AS Utf8; DECLARE $privacy_version AS Utf8;
      INSERT INTO submissions (
        id, form_type, status, name, email, pkch_code, ninety_day_task, product,
        order_number, access_token_hash, consent_version, privacy_version,
        created_at, updated_at, retention_until
      ) VALUES (
        $id, $form_type, $status, $name, $email, $pkch_code, $ninety_day_task,
        $product, $order_number, $access_token_hash, $consent_version,
        $privacy_version, CurrentUtcTimestamp(), CurrentUtcTimestamp(),
        CurrentUtcTimestamp() + Interval("P180D")
      );
    `;
    params = {
      ...commonParams,
      '$pkch_code': TypedValues.utf8(data.pkchCode),
      '$ninety_day_task': TypedValues.utf8(data.ninetyDayTask)
    };
  }
  const driver = await getDriver();
  await driver.tableClient.withSessionRetry(async session => {
    // The same paid link returns the original receipt instead of adding another questionnaire.
    const existing = await session.executeQuery('DECLARE $id AS Utf8; SELECT id FROM submissions WHERE id = $id;', {'$id': TypedValues.utf8(id)});
    if (existing.resultSets[0]?.rows?.length) return;
    await session.executeQuery(query, params);
  });
  return id;
}

async function controlPaid(order) {
  const driver = await getDriver();
  return driver.tableClient.withSessionRetry(async session => {
    const result = await session.executeQuery('DECLARE $id AS Utf8; SELECT id FROM control_payments WHERE id = $id;', {'$id': TypedValues.utf8(order)});
    return Boolean(result.resultSets[0]?.rows?.length);
  });
}
async function mailSent(order) {
  const driver = await getDriver();
  return driver.tableClient.withSessionRetry(async session => {
    const result = await session.executeQuery('DECLARE $id AS Utf8; SELECT id FROM control_payments WHERE id = $id AND mail_sent_at IS NOT NULL;', {'$id': TypedValues.utf8(order)});
    return Boolean(result.resultSets[0]?.rows?.length);
  });
}
async function recordMail(order) {
  const driver = await getDriver();
  await driver.tableClient.withSessionRetry(async session => session.executeQuery('DECLARE $id AS Utf8; UPDATE control_payments SET mail_sent_at = CurrentUtcTimestamp() WHERE id = $id;', {'$id': TypedValues.utf8(order)}));
}
async function recordPayment(order) {
  const driver = await getDriver();
  await driver.tableClient.withSessionRetry(async session => session.executeQuery(`
    DECLARE $id AS Utf8;
    UPSERT INTO control_payments (id, paid_at, retention_until)
    VALUES ($id, CurrentUtcTimestamp(), CurrentUtcTimestamp() + Interval("P180D"));
  `, {'$id': TypedValues.utf8(order)}));
}
async function paymentResult(event) {
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : String(event.body || '');
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES) throw new Error('body_too_large');
    const params = new URLSearchParams(raw);
    const control = fulfillment.verifyPayment(params);
    // Persist payment before mailing: no link can be used without a verified paid record.
    await recordPayment(control.order);
    // SMTP is at-least-once: a provider retry can resend the same link, never mint another access.
    if (!(await mailSent(control.order))) {
      await fulfillment.sendQuestionnaire();
      await recordMail(control.order);
    }
    return {statusCode: 200, headers: {'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store'}, body: 'OK' + control.order};
  } catch (error) {
    const invalid = ['invalid_payment', 'body_too_large'].includes(error.message);
    console.error('payment_callback_failed', {code: invalid ? error.message : 'fulfillment_unavailable'});
    return response(invalid ? 400 : 503, {ok:false, error:invalid ? 'invalid_payment' : 'fulfillment_unavailable'});
  }
}
module.exports.handler = async function handler(event) {
  // Cloud Functions is private. Only an IAM-authorized raw invocation can run this
  // diagnostic; API Gateway always supplies httpMethod/requestContext.
  if (event?.controlDiagnostic === 'smtp-and-database' && !event.httpMethod && !event.requestContext) {
    let stage = 'smtp';
    try {
      await fulfillment.verifyMailer();
      stage = 'configuration';
      const control = fulfillment.settings();
      stage = 'database';
      await controlPaid(control.order);
      return response(200, {ok:true, smtpReady:true, databaseReady:true});
    } catch (error) {
      const known = new Set(['EAUTH', 'ECONNECTION', 'ETIMEDOUT', 'ENOTFOUND', 'ESOCKET', 'ECONNREFUSED', 'ECONNRESET', 'CERT_HAS_EXPIRED', 'ERR_TLS_CERT_ALTNAME_INVALID']);
      const classes = new Set(['Error','TypeError','Unauthenticated','Unauthorized','BadRequest','SchemeError','Overloaded','Unavailable','Timeout','SessionPoolEmpty','TransportUnavailable']);
      const causes = ['database_not_configured','database_unavailable'].includes(error.message) ? error.message : undefined;
      return response(503, {ok:false, stage, error: known.has(error.code) ? error.code : 'diagnostic_failed', errorClass:classes.has(error.constructor?.name)?error.constructor.name:'Other', cause:causes});
    }
  }
  const method = event?.httpMethod || event?.requestContext?.http?.method || 'POST';
  if (event?.queryStringParameters?.action === 'payment') {
    if (method !== 'POST') return response(405, {ok:false, error:'method_not_allowed'});
    return paymentResult(event);
  }
  const origin = event?.headers?.origin || event?.headers?.Origin || '';
  if (method === 'OPTIONS') return response(204, null);
  if (method !== 'POST') return response(405, { ok: false, error: 'method_not_allowed' });
  if (origin !== ALLOWED_ORIGIN) return response(403, { ok: false, error: 'origin_not_allowed' });
  try {
    const data = validate(parseBody(event));
    const control = fulfillment.authorizeSubmission(data);
    if (!(await controlPaid(control.order))) throw new Error('invalid_token');
    if (!data.birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(data.birthDate) || !data.birthTime || !data.birthTimeAccuracy || !data.birthPlace || !data.mainQuestion) throw new Error('required_fields');
    const id = await saveSubmission(data);
    return response(201, { ok: true, id });
  } catch (error) {
    const safeErrors = new Set(['body_too_large', 'invalid_field', 'invalid_form', 'required_fields', 'invalid_token']);
    const code = safeErrors.has(error.message) ? error.message : 'internal_error';
    console.error('submission_failed', { code });
    return response(code === 'internal_error' ? 503 : 400, { ok: false, error: code });
  }
};
