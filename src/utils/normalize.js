// Maps API response shapes to the field names the UI expects.
// The API uses snake_case; UI components use camelCase from the original mock data.

const CAPSULE_TYPE_MAP = {
  self: "MESSAGE",
  private: "MESSAGE",
  public: "COLLECTIVE",
};

/**
 * Convert a raw API capsule object to the shape UI components expect.
 * Pass `currentUserId` (the logged-in user's UUID string) to show "You" for own capsules.
 */
export function normalizeCapsule(c, currentUserId = null) {
  const isOwn = currentUserId && c.created_by === currentUserId;
  const actualName = c.created_by_username || "futrr user";
  const displayName = isOwn ? "You" : actualName;

  return {
    id: c.id,
    title: c.title || "Untitled capsule",
    description: c.description || "",
    from: displayName,
    fromInitial: actualName[0].toUpperCase(),
    fromAvatar: c.created_by_avatar || null,
    type: CAPSULE_TYPE_MAP[c.capsule_type] || "MESSAGE",
    status: c.status, // "sealed" | "unlocked" | "expired" | "broken"
    unlocksAt: c.unlock_at,
    sealedAt: c.sealed_at,
    isFavorited: c.is_favorited ?? false,
    isPinned: c.is_pinned ?? false,
    isPublic: c.is_public,
    listedInAtlas: c.listed_in_atlas ?? true,
    favoriteCount: c.favorite_count ?? 0,
    pinCount: c.pin_count ?? 0,
    shareToken: c.share_token,
    latitude: c.latitude,
    longitude: c.longitude,
    locationName: c.location_name,
    contents: c.contents ?? [],
    contentTypes: c.content_types ?? [],
    encryptionType: c.encryption_type ?? "auto", // "auto" | "self"
    passphraseHint: c.passphrase_hint || null,
    createdBy: c.created_by,
    _id: c.id,
    recipients: (c.recipients ?? []).map((r) => ({
      id: r.id,
      userId: r.user_id ?? r.user ?? r.id,
      username: r.username ?? r.user_username ?? "Unknown",
      avatar: r.avatar ?? r.user_avatar ?? null,
      initial: (r.username ?? r.user_username ?? "?")[0].toUpperCase(),
    })),
  };
}

/**
 * Convert a raw API notification object to the shape UI components expect.
 */
export function normalizeNotification(n) {
  return {
    id: n.id,
    read: n.is_read,
    fromInitial: senderInitial(n.type),
    message: n.title,
    subtitle: n.body,
    time: formatRelativeTime(n.created_at),
    relatedCapsule: n.related_capsule,
    relatedCapsuleTitle: n.related_capsule_title ?? null,
    relatedEvent: n.related_event,
    type: n.type,
  };
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function senderInitial(notifType) {
  switch (notifType) {
    case "capsule_unlocked":
      return "U";
    case "recipient_added":
      return "R";
    case "event_joined":
    case "event_unlocked":
      return "E";
    default:
      return "?";
  }
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
