// Simple event bus for event creation updates across screens.
// DiscoverScreen EventsTab subscribes; CreateEventScreen emits after an event is created.

const listeners = new Set();

export const eventBus = {
  on(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  emit(event) {
    listeners.forEach((cb) => cb(event));
  },
};
