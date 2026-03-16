import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/constants";

export function Divider() {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>or</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 20,
    gap: 10,
    paddingHorizontal: 15,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.mutedFg,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
});
