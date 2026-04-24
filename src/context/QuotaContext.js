import { createContext, useState, useCallback, useEffect, useRef } from "react";
import { getQuota } from "@/services/user";

export const QuotaContext = createContext({
  quota: null,
  capsuleLimitReached: false,
  eventLimitReached: false,
  refreshQuota: () => {},
});

export function QuotaProvider({ children, isLoggedIn }) {
  const [quota, setQuota] = useState(null);
  const fetchedRef = useRef(false);

  const refreshQuota = useCallback(async () => {
    try {
      const data = await getQuota();
      setQuota(data);
    } catch {
      // silent — don't block the UI
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchedRef.current = false;
      refreshQuota();
    } else {
      setQuota(null);
    }
  }, [isLoggedIn, refreshQuota]);

  const findQuota = (key) => quota?.quotas?.find((q) => q.key === key);

  const isAtLimit = (key) => {
    const q = findQuota(key);
    if (!q || q.used === null || q.limit === null) return false;
    return q.used >= q.limit;
  };

  return (
    <QuotaContext.Provider
      value={{
        quota,
        capsuleLimitReached: isAtLimit("capsules_per_week"),
        eventLimitReached: isAtLimit("events_per_week"),
        refreshQuota,
      }}
    >
      {children}
    </QuotaContext.Provider>
  );
}
