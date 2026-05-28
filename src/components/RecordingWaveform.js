import { View, Animated, StyleSheet } from "react-native";
import { useRef, useEffect } from "react";
import { useTheme } from "@/hooks/useTheme";

const NUM_BARS = 24;
const BAR_MIN_H = 3;

export default function RecordingWaveform({ isActive }) {
  const { colors } = useTheme();
  const animVals = useRef(
    Array.from({ length: NUM_BARS }, () => new Animated.Value(BAR_MIN_H))
  ).current;

  useEffect(() => {
    if (isActive) {
      const anims = animVals.map((val, i) => {
        const maxH = BAR_MIN_H + 4 + (i % 5) * 7;
        const up   = Animated.timing(val, { toValue: maxH, duration: 300 + (i % 4) * 80, useNativeDriver: false });
        const down = Animated.timing(val, { toValue: BAR_MIN_H, duration: 300 + (i % 4) * 80, useNativeDriver: false });
        return Animated.loop(Animated.sequence([up, down]));
      });
      Animated.stagger(25, anims).start();
      return () => {
        anims.forEach((a) => a.stop());
        animVals.forEach((v) => v.setValue(BAR_MIN_H));
      };
    } else {
      animVals.forEach((v) => v.setValue(BAR_MIN_H));
    }
  }, [isActive]);

  return (
    <View style={styles.container}>
      {animVals.map((val, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            {
              height: val,
              backgroundColor: isActive ? colors.primary : `${colors.primary}55`,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    gap: 3,
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
});
