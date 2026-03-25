import { createContext, useState, useCallback } from "react";

export const TourContext = createContext({
  tourActive: false,
  tourStep: 0,
  tourTarget: null,
  showTooltip: false,
  startTour: () => {},
  nextStep: () => {},
  endTour: () => {},
  dismissTooltip: () => {},
});

const TOUR_TARGETS = ["vault", "fab", "favorites", "discover", "atlas", "timeline"];
const TOTAL_STEPS = TOUR_TARGETS.length;

export function TourProvider({ children }) {
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);

  const startTour = useCallback(() => {
    setTourStep(0);
    setTourActive(true);
    setShowTooltip(false);
  }, []);

  const nextStep = useCallback(() => {
    setTourStep((prev) => {
      if (prev >= TOTAL_STEPS - 1) {
        setTourActive(false);
        setShowTooltip(true);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const endTour = useCallback(() => {
    setTourActive(false);
    setTourStep(0);
    setShowTooltip(true);
  }, []);

  const dismissTooltip = useCallback(() => {
    setShowTooltip(false);
  }, []);

  const tourTarget = tourActive ? TOUR_TARGETS[tourStep] : null;

  return (
    <TourContext.Provider value={{ tourActive, tourStep, tourTarget, showTooltip, startTour, nextStep, endTour, dismissTooltip }}>
      {children}
    </TourContext.Provider>
  );
}
