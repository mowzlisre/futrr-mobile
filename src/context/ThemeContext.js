import { createContext, useState, useEffect, useCallback } from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  darkColors,
  lightColors,
  darkMapStyle,
  lightMapStyle,
} from "@/constants/themes";

export const ThemeContext = createContext();

const THEME_KEY = "theme";

export function ThemeProvider({ children }) {
  // mode: "light" | "dark" | "system"
  const [mode, setModeState] = useState("system");
  const systemScheme = useColorScheme(); // "light" | "dark" | null

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY).then((val) => {
      if (val === "light" || val === "dark" || val === "system") {
        setModeState(val);
      }
    });
  }, []);

  const setMode = useCallback(async (newMode) => {
    setModeState(newMode);
    await SecureStore.setItemAsync(THEME_KEY, newMode);
  }, []);

  const isDark =
    mode === "dark" ? true : mode === "light" ? false : systemScheme === "dark";

  const colors = isDark ? darkColors : lightColors;
  const mapStyle = isDark ? darkMapStyle : lightMapStyle;

  // Keep legacy toggle for backward compat (cycles light → dark → system)
  const toggle = useCallback(() => {
    const next = mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
    setMode(next);
  }, [mode, setMode]);

  return (
    <ThemeContext.Provider value={{ colors, isDark, mode, setMode, toggle, mapStyle }}>
      {children}
    </ThemeContext.Provider>
  );
}
