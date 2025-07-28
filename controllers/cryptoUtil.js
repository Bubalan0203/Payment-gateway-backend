import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const ivLength = 12; // Recommended IV size for GCM

// ✅ 32-byte shared key (must be kept secure; store in env or vault in real apps)
export const sharedKey = Buffer.from('12345678901234567890123456789012');

/**
 * 🔐 Encrypts a string or object using AES-256-GCM
 * @param {object|string} data - Data to encrypt
 * @returns {{ content: string, iv: string, tag: string }}
 */
export const encrypt = (data) => {
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
 * @param {{ content: string, iv: string, tag: string }} encryptedData
 * @returns {string|object} - Decrypted string or parsed object
 */
export const decrypt = ({ content, iv, tag }) => {
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

  // Attempt to parse JSON if possible
  try {
    return JSON.parse(decryptedStr);
  } catch (err) {
    return decryptedStr;
  }
};