import crypto from 'node:crypto';
import fs from 'node:fs';

const mode = process.argv[2];
const token = process.env.TELEGRAM_BOT_TOKEN;
const privateKey = process.env.TELEGRAM_DECRYPT_KEY;
const publicKeyPath = new URL('./publisher-public.pem', import.meta.url);
const clubChatPath = new URL('./club-chat.enc', import.meta.url);

if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not configured.');
if (!privateKey) throw new Error('TELEGRAM_DECRYPT_KEY is not configured.');

function encryptSmall(value) {
  return crypto.publicEncrypt(
    { key: fs.readFileSync(publicKeyPath, 'utf8'), oaepHash: 'sha256', padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
    Buffer.from(value, 'utf8'),
  ).toString('base64');
}

function decryptSmall(value) {
  return crypto.privateDecrypt(
    { key: privateKey, oaepHash: 'sha256', padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
    Buffer.from(value.trim(), 'base64'),
  ).toString('utf8');
}

function decryptPayload(value) {
  const envelope = JSON.parse(Buffer.from(value, 'base64').toString('utf8'));
  const key = crypto.privateDecrypt(
    { key: privateKey, oaepHash: 'sha256', padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
    Buffer.from(envelope.key, 'base64'),
  );
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  return JSON.parse(Buffer.concat([
    decipher.update(Buffer.from(envelope.data, 'base64')),
    decipher.final(),
  ]).toString('utf8'));
}

async function telegram(method, body = {}) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(`Telegram rejected ${method}: ${result.description || response.status}`);
  return result.result;
}

if (mode === 'setup') {
  const updates = await telegram('getUpdates', {
    allowed_updates: ['my_chat_member', 'channel_post'],
    timeout: 0,
  });
  const chats = updates.flatMap((update) => [
    update.my_chat_member?.chat,
    update.channel_post?.chat,
  ]).filter(Boolean);
  const club = [...chats].reverse().find((chat) => chat.type === 'channel' && /club/i.test(chat.title || ''));
  if (!club) throw new Error('CLUB was not found. Publish one temporary message in the CLUB channel, then run setup again.');
  fs.writeFileSync(clubChatPath, `${encryptSmall(String(club.id))}\n`, { mode: 0o600 });
  console.log('CLUB channel connected securely.');
} else if (mode === 'publish') {
  const payload = decryptPayload(process.env.TELEGRAM_PAYLOAD || '');
  if (!['main', 'club'].includes(payload.channel)) throw new Error('Unknown channel.');
  if (typeof payload.message !== 'string' || !payload.message.trim()) throw new Error('Message is empty.');
  if ([...payload.message].length > 4096) throw new Error('Message exceeds 4096 characters.');
  const chatId = payload.channel === 'main'
    ? '@methodkandakov'
    : decryptSmall(fs.readFileSync(clubChatPath, 'utf8'));
  const sent = await telegram('sendMessage', {
    chat_id: chatId,
    text: payload.message,
    disable_web_page_preview: false,
  });
  console.log(`Telegram accepted the publication (message ${sent.message_id}).`);
} else {
  throw new Error('Use setup or publish mode.');
}
