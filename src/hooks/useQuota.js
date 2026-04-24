import { useContext } from "react";
import { QuotaContext } from "@/context/QuotaContext";

export function useQuota() {
  return useContext(QuotaContext);
}
