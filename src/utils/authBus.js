/**
 * Module-level event bus for auth events.
 * Allows api.js (a plain module) to signal AuthContext to force-logout
 * when a token refresh fails.
 */
const listeners = new Set();

export const authBus = {
  onForceLogout(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  forceLogout() {
    listeners.forEach((cb) => cb());
  },
};
