import { View, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { Particle, PARTICLES } from "./Particle";

export function ParticleField({ isDark = true }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {PARTICLES.map((p) => (
        <Particle key={p.id} {...p} />
      ))}
      <BlurView intensity={isDark ? 82 : 70} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} pointerEvents="none" />
    </View>
  );
}
