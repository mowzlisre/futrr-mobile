import { useEffect, useRef } from "react";
import { AppState } from "react-native";

/**
 * Calls `callback` every time the app returns to the foreground
 * (from background or inactive state).
 */
export function useAppForeground(callback) {
  const appState = useRef(AppState.currentState);
  // Keep a stable ref so callers don't need to memoize the callback
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        cbRef.current();
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, []);
}
