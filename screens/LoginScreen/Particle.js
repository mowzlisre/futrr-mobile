import { Animated, Easing } from "react-native";
import { useRef, useEffect } from "react";

export const PARTICLES = [
  { id: 0, x: "18%", y: "8%", size: 180, color: "rgba(234,166,70,0.22)", dur: 7800, delay: 0, driftX: 18, driftY: 22 },
  { id: 1, x: "68%", y: "14%", size: 140, color: "rgba(196,113,74,0.18)", dur: 9200, delay: 1100, driftX: -14, driftY: 18 },
  { id: 2, x: "42%", y: "55%", size: 200, color: "rgba(234,166,70,0.14)", dur: 8500, delay: 400, driftX: 10, driftY: -16 },
  { id: 3, x: "80%", y: "60%", size: 130, color: "rgba(212,165,116,0.20)", dur: 7000, delay: 2200, driftX: -20, driftY: 12 },
  { id: 4, x: "5%", y: "70%", size: 160, color: "rgba(196,113,74,0.15)", dur: 9800, delay: 600, driftX: 16, driftY: -10 },
  { id: 5, x: "55%", y: "28%", size: 80, color: "rgba(234,166,70,0.30)", dur: 5500, delay: 800, driftX: -10, driftY: 14 },
  { id: 6, x: "25%", y: "38%", size: 65, color: "rgba(212,165,116,0.28)", dur: 6200, delay: 1800, driftX: 12, driftY: -18 },
  { id: 7, x: "75%", y: "42%", size: 90, color: "rgba(234,166,70,0.22)", dur: 7400, delay: 300, driftX: -8, driftY: 20 },
  { id: 8, x: "88%", y: "22%", size: 55, color: "rgba(196,113,74,0.32)", dur: 5000, delay: 2600, driftX: -14, driftY: -12 },
  { id: 9, x: "12%", y: "48%", size: 70, color: "rgba(234,166,70,0.25)", dur: 6800, delay: 1400, driftX: 18, driftY: 10 },
  { id: 10, x: "62%", y: "78%", size: 30, color: "rgba(234,166,70,0.55)", dur: 4200, delay: 500, driftX: -6, driftY: -8 },
  { id: 11, x: "33%", y: "85%", size: 22, color: "rgba(212,165,116,0.50)", dur: 3800, delay: 1600, driftX: 8, driftY: -6 },
  { id: 12, x: "50%", y: "12%", size: 18, color: "rgba(234,166,70,0.60)", dur: 4600, delay: 900, driftX: -4, driftY: 10 },
  { id: 13, x: "90%", y: "80%", size: 26, color: "rgba(196,113,74,0.45)", dur: 5200, delay: 2000, driftX: -10, driftY: -4 },
  { id: 14, x: "8%", y: "22%", size: 20, color: "rgba(234,166,70,0.55)", dur: 3600, delay: 700, driftX: 6, driftY: 8 },
];

export function Particle({ x, y, size, color, dur, delay, driftX, driftY }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.15)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(translateX, { toValue: driftX, duration: dur, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(translateY, { toValue: driftY, duration: dur, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.85, duration: dur * 0.5, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.12, duration: dur * 0.7, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(translateX, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.15, duration: dur * 0.5, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.85, duration: dur * 0.7, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: x, top: y,
        width: size, height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    />
  );
}
