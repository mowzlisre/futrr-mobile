import { createContext, useState, useEffect } from "react";
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
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY).then((val) => {
      if (val === "light") setIsDark(false);
    });
  }, []);

  const toggle = async () => {
    const next = !isDark;
    setIsDark(next);
    await SecureStore.setItemAsync(THEME_KEY, next ? "dark" : "light");
  };

  const colors = isDark ? darkColors : lightColors;
  const mapStyle = isDark ? darkMapStyle : lightMapStyle;

  return (
    <ThemeContext.Provider value={{ colors, isDark, toggle, mapStyle }}>
      {children}
    </ThemeContext.Provider>
  );
}
