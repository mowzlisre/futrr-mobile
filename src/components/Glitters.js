import { View, StyleSheet, Animated } from "react-native";
import { useEffect, useRef, useMemo } from "react";
import { useWindowDimensions } from "react-native";

const CHARS = ["✦", "✧", "·", "⋆", "*"];

function GlitterDot({ x, y, size, duration, delay, color, char }) {
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(op, { toValue: 1,   duration: duration * 0.4, useNativeDriver: true }),
          Animated.timing(sc, { toValue: 1,   duration: duration * 0.4, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(op, { toValue: 0,   duration: duration * 0.6, useNativeDriver: true }),
          Animated.timing(sc, { toValue: 0.6, duration: duration * 0.6, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.Text
      style={{
        position: "absolute",
        left: x, top: y,
        fontSize: size, color,
        opacity: op,
        transform: [{ scale: sc }],
      }}
    >
      {char}
    </Animated.Text>
  );
}

export default function Glitters({ color, count = 30 }) {
  const { width, height } = useWindowDimensions();
  const dots = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * (width - 20),
      y: Math.random() * (height - 20),
      size: Math.random() * 10 + 8,
      duration: 1400 + Math.random() * 2000,
      delay: Math.random() * 2500,
      char: CHARS[Math.floor(Math.random() * CHARS.length)],
    })),
    [width, height]
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {dots.map(d => (
        <GlitterDot key={d.id} {...d} color={color} />
      ))}
    </View>
  );
}
