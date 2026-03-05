import { createContext, useState, useEffect } from "react";
import { getAccessToken } from "../services/auth";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  const login = (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
  };

  const logout = () => {
    setUser(null);
    setIsLoggedIn(false);
  };

  // Check for existing token on app launch
  useEffect(() => {
    const checkExistingToken = async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          setIsLoggedIn(true);
        }
      } catch (err) {
        console.error("Error checking token:", err);
      } finally {
        setInitializing(false);
      }
    };

    checkExistingToken();
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, loading, setLoading, initializing, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
