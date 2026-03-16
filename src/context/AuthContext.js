import { createContext, useState, useEffect } from "react";
import { getAccessToken, getRefreshToken, clearTokens } from "@/services/storage";
import { getProfile } from "@/services/user";
import { logoutUser } from "@/services/auth";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const login = (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
  };

  const logout = async () => {
    try {
      const refresh = await getRefreshToken();
      if (refresh) await logoutUser(refresh);
    } catch (_) {}
    await clearTokens();
    setUser(null);
    setIsLoggedIn(false);
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          // Restore user profile from API so the app has fresh data on launch
          const profile = await getProfile();
          setUser(profile);
          setIsLoggedIn(true);
        }
      } catch (_) {
        // Token present but invalid/expired and refresh also failed — stay logged out
        await clearTokens();
      } finally {
        setInitializing(false);
      }
    };

    checkSession();
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, initializing, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
