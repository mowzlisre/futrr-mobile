import { useContext } from "react";
import { TourContext } from "@/context/TourContext";

export function useTour() {
  return useContext(TourContext);
}
