import { createContext, useState, useEffect } from "react";
import { getAccessToken, getRefreshToken, clearTokens } from "@/services/storage";
import { getProfile } from "@/services/user";
import { logoutUser } from "@/services/auth";
import { authBus } from "@/utils/authBus";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const login = (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
  };

  const updateUser = (patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : patch));
  };

  const logout = async () => {
    const refresh = await getRefreshToken();
    const access = await getAccessToken();
    // Clear local state and tokens first so the UI transitions immediately
    await clearTokens();
    setUser(null);
    setIsLoggedIn(false);
    // Fire-and-forget server-side blacklist (bypasses interceptor)
    if (refresh && access) logoutUser(refresh, access).catch(() => {});
  };

  // Force-logout when a token refresh fails (expired/invalid refresh token)
  useEffect(() => {
    return authBus.onForceLogout(() => {
      setUser(null);
      setIsLoggedIn(false);
    });
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          const profile = await getProfile();
          setUser(profile);
          setIsLoggedIn(true);
        }
      } catch (_) {
        await clearTokens();
      } finally {
        setInitializing(false);
      }
    };

    checkSession();
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, initializing, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
