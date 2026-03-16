/**
 * In-memory TTL cache for unlocked capsule detail objects.
 *
 * Pre-signed S3 URLs expire in 15 minutes, so we cache for 10 minutes
 * to stay safely within that window.
 */

const TTL_MS = 10 * 60 * 1000; // 10 minutes
const cache = new Map(); // id → { data, expiresAt }

export function getCachedCapsule(id) {
  const entry = cache.get(id);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(id);
    return null;
  }
  return entry.data;
}

export function setCachedCapsule(id, data) {
  cache.set(id, { data, expiresAt: Date.now() + TTL_MS });
}

export function invalidateCapsule(id) {
  cache.delete(id);
}
