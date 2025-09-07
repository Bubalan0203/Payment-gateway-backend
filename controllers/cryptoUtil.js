const crypto = require('crypto');

const algorithm = 'aes-256-gcm';
const ivLength = 12; // Recommended IV size for GCM

// ✅ 32-byte shared key (must be kept secure; store in env or vault in real apps)
const sharedKey = Buffer.from('12345678901234567890123456789012');

/**
 * 🔐 Encrypts a string or object using AES-256-GCM
 */
const encrypt = (data) => {
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, sharedKey, iv);

  const jsonData = typeof data === 'string' ? data : JSON.stringify(data);

  const encrypted = Buffer.concat([
    cipher.update(jsonData, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return {
    content: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
};

/**
 * 🔓 Decrypts an AES-256-GCM encrypted object
 */
const decrypt = ({ content, iv, tag }) => {
  if (!content || !iv || !tag) {
    throw new Error('❌ Invalid encrypted data format.');
  }

  const decipher = crypto.createDecipheriv(
    algorithm,
    sharedKey,
    Buffer.from(iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(content, 'base64')),
    decipher.final(),
  ]);

  const decryptedStr = decrypted.toString('utf8');

  try {
    return JSON.parse(decryptedStr);
  } catch {
    return decryptedStr;
  }
};

module.exports = { sharedKey, encrypt, decrypt };
