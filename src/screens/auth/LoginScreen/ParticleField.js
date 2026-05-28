import { View, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { Particle, PARTICLES } from "./Particle";

export function ParticleField({ isDark = true }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {PARTICLES.map((p) => (
        <Particle key={p.id} {...p} />
      ))}
      {Platform.OS === "ios" ? (
        <BlurView intensity={isDark ? 82 : 70} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} pointerEvents="none" />
      ) : (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "rgba(10,10,15,0.78)" : "rgba(237,232,224,0.78)" }]}
          pointerEvents="none"
        />
      )}
    </View>
  );
}
