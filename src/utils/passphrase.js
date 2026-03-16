import * as SecureStore from "expo-secure-store";

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

// Word list for human-readable passphrases
const WORDS = [
  "amber", "bridge", "canvas", "dream", "echo", "flame", "grace", "harbor",
  "ivory", "jade", "kite", "lemon", "maple", "nova", "ocean", "petal",
  "quartz", "river", "stone", "tiger", "ultra", "velvet", "willow", "xenon",
  "yellow", "zenith", "arctic", "bloom", "cedar", "dawn", "ember", "forest",
  "glow", "haven", "ink", "jewel", "kelp", "lunar", "mist", "night",
  "orbit", "prism", "quest", "ridge", "silver", "topaz", "unity", "violet",
];

/**
 * Generate a 4-word passphrase like "amber-bridge-river-nova"
 */
export function generatePassphrase() {
  const pick = () => WORDS[Math.floor(Math.random() * WORDS.length)];
  return [pick(), pick(), pick(), pick()].join("-");
}

function _key(capsuleId) {
  return `futrr_passphrase_${capsuleId}`;
}

/**
 * Store passphrase for capsuleId with a 1-week TTL.
 * Saves JSON: { passphrase, expiresAt }
 */
export async function storePassphrase(capsuleId, passphrase) {
  const payload = JSON.stringify({
    passphrase,
    expiresAt: Date.now() + TTL_MS,
  });
  await SecureStore.setItemAsync(_key(capsuleId), payload);
}

/**
 * Retrieve stored passphrase for capsuleId.
 * Returns null if not found or expired (and deletes expired entry).
 */
export async function getStoredPassphrase(capsuleId) {
  try {
    const raw = await SecureStore.getItemAsync(_key(capsuleId));
    if (!raw) return null;
    const { passphrase, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) {
      await SecureStore.deleteItemAsync(_key(capsuleId));
      return null;
    }
    return passphrase;
  } catch {
    return null;
  }
}
