/**
 * In-memory TTL cache for capsule data.
 *
 * Detail objects (with pre-signed S3 URLs): 10-min TTL (URLs expire at 15 min).
 * List responses (vault, timeline, profile): 5-min TTL.
 */

const DETAIL_TTL = 10 * 60 * 1000;
const LIST_TTL   =  5 * 60 * 1000;

const detailCache = new Map(); // capsuleId → { data, expiresAt }
const listCache   = new Map(); // key → { data, expiresAt }

// ── Detail cache ─────────────────────────────────────────────────────────────

export function getCachedCapsule(id) {
  const entry = detailCache.get(id);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { detailCache.delete(id); return null; }
  return entry.data;
}

export function setCachedCapsule(id, data) {
  detailCache.set(id, { data, expiresAt: Date.now() + DETAIL_TTL });
}

// ── List cache (vault, timeline, profile, etc.) ───────────────────────────────

export function getCachedList(key) {
  const entry = listCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { listCache.delete(key); return null; }
  return entry.data;
}

export function setCachedList(key, data) {
  listCache.set(key, { data, expiresAt: Date.now() + LIST_TTL });
}

export function invalidateList(key) {
  listCache.delete(key);
}
