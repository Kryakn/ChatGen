// Simple End-to-End Encryption Utility
// Uses AES-GCM encryption via Web Crypto API

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

// Generate a shared key from two user IDs
// Same key will be generated for both users (userA+userB = userB+userA)
async function generateSharedKey(userId1, userId2) {
  // Sort IDs to ensure same key for both users
  const sortedIds = [userId1, userId2].sort().join("");

  // Create a deterministic key from the sorted IDs
  const encoder = new TextEncoder();
  const data = encoder.encode(sortedIds);

  // Use PBKDF2 to derive a key
  const baseKey = await crypto.subtle.importKey(
    "raw",
    data,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  // Derive AES-GCM key
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("chat-app-salt"),
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypt text message
export async function encryptMessage(text, userId1, userId2) {
  try {
    const key = await generateSharedKey(userId1, userId2);
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );

    // Combine IV + encrypted data and convert to base64
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error("Encryption error:", error);
    return null;
  }
}

// Decrypt text message
export async function decryptMessage(encryptedBase64, userId1, userId2) {
  try {
    const key = await generateSharedKey(userId1, userId2);

    // Decode base64
    const combined = new Uint8Array(
      atob(encryptedBase64)
        .split("")
        .map((c) => c.charCodeAt(0))
    );

    // Extract IV and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error("Decryption error:", error);
    return "[Unable to decrypt message]";
  }
}

// Check if message is encrypted
export function isEncrypted(text) {
  if (!text) return false;
  // Encrypted messages are base64 and longer than normal text
  try {
    const decoded = atob(text);
    return decoded.length > 0 && text.length > 20;
  } catch {
    return false;
  }
}
