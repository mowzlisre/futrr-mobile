import { Pressable, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/useTheme";

/**
 * Shared pill-shaped button.
 *
 * Props:
 *   label      — button text (used when no children supplied)
 *   children   — custom content (icons + text + anything). Takes precedence over label.
 *   onPress    — handler
 *   loading    — shows spinner, disables press
 *   disabled   — dims and disables press
 *   variant    — "primary" (default) | "secondary" | "danger" | "ghost"
 *   size       — "md" (default) | "sm" | "lg"
 *   fullWidth  — stretch to parent width
 */
export default function PillButton({
  label,
  children,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  size = "md",
  fullWidth = false,
  accessibilityLabel,
}) {
  const { colors } = useTheme();

  const bg = {
    primary: colors.primary,
    secondary: colors.card,
    danger: `${colors.error}18`,
    ghost: "transparent",
  }[variant];

  const textColor = {
    primary: colors.primaryFg,
    secondary: colors.foreground,
    danger: colors.error,
    ghost: colors.foreground,
  }[variant];

  const borderColor = {
    primary: "transparent",
    secondary: colors.border,
    danger: `${colors.error}40`,
    ghost: colors.border,
  }[variant];

  const padding = { sm: { h: 14, v: 9 }, md: { h: 22, v: 13 }, lg: { h: 28, v: 16 } }[size];
  const fontSize = { sm: 11, md: 13, lg: 15 }[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: bg,
          borderColor,
          paddingHorizontal: padding.h,
          paddingVertical: padding.v,
          opacity: disabled || loading ? 0.5 : pressed ? 0.82 : 1,
          alignSelf: fullWidth ? "stretch" : "center",
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : children !== undefined ? (
        children
      ) : (
        <Text style={[styles.label, { fontSize, color: textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  label: {
    fontWeight: "300",
    letterSpacing: 0.2,
  },
});
