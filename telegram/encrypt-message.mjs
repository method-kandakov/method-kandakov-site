import crypto from "node:crypto";
import fs from "node:fs";

const [channel, ...messageParts] = process.argv.slice(2);
const message = messageParts.join(" ").trim();

if (!['main', 'club'].includes(channel) || !message) {
  console.error('Usage: node telegram/encrypt-message.mjs <main|club> "Message"');
  process.exit(1);
}

if ([...message].length > 4096) {
  console.error('Telegram text messages are limited to 4096 characters.');
  process.exit(1);
}

const publicKey = fs.readFileSync(new URL('./publisher-public.pem', import.meta.url), 'utf8');
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const plaintext = Buffer.from(JSON.stringify({ channel, message }), 'utf8');
const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
const tag = cipher.getAuthTag();
const wrappedKey = crypto.publicEncrypt(
  { key: publicKey, oaepHash: 'sha256', padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
  key,
);

process.stdout.write(Buffer.from(JSON.stringify({
  key: wrappedKey.toString('base64'),
  iv: iv.toString('base64'),
  tag: tag.toString('base64'),
  data: ciphertext.toString('base64'),
})).toString('base64'));
