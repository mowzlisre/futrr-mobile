// Simple event bus for vault updates across screens.
// VaultScreen subscribes; CreateCapsuleScreen emits after a capsule is created.

const listeners = new Set();

export const vaultBus = {
  on(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  emit(capsule) {
    listeners.forEach((cb) => cb(capsule));
  },
};
