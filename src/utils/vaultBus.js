// Simple event bus for vault updates across screens.
// VaultScreen subscribes; CreateCapsuleScreen emits after a capsule is created.
// LockedCapsuleScreen emits { _updateId, status } to patch an existing capsule.

const listeners = new Set();

export const vaultBus = {
  on(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  emit(capsule) {
    listeners.forEach((cb) => cb(capsule));
  },
  // Patch an existing capsule's status in the vault list.
  // VaultScreen checks for _updateId to distinguish patches from new capsules.
  patch(id, patch) {
    listeners.forEach((cb) => cb({ _updateId: id, ...patch }));
  },
};
