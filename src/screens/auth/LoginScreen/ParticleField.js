import { View, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { Particle, PARTICLES } from "./Particle";

export function ParticleField() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {PARTICLES.map((p) => (
        <Particle key={p.id} {...p} />
      ))}
      <BlurView intensity={82} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
    </View>
  );
}
