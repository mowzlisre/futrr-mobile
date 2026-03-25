import { TextInput, Animated, Easing, StyleSheet } from "react-native";
import { useState, useRef, useEffect, useMemo } from "react";
import { useTheme } from "@/hooks/useTheme";

export function FutrrInput({ placeholder, value, onChangeText, secureTextEntry = false }) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: focused ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [focused]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.10)",
      "rgba(234,166,70,0.5)",
    ],
  });
  const shadowOpacity = borderAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] });

  return (
    <Animated.View
      style={[
        styles.inputWrapper,
        { borderColor, shadowColor: colors.primary, shadowOpacity, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
      ]}
    >
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.mutedFg}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </Animated.View>
  );
}

const makeStyles = (colors, isDark) => StyleSheet.create({
  inputWrapper: {
    borderRadius: 25,
    borderWidth: 1,
    overflow: "hidden",
  },
  input: {
    backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    paddingHorizontal: 18,
    paddingVertical: 15,
    color: colors.foreground,
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
