import { View, Image, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from "@/hooks/useTheme";

export default function SplashLoader() {
  const { colors, isDark } = useTheme();
  const logo = require("../../assets/futrr-banner-transparent.png");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
      <View style={styles.bottom}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  bottom: { paddingBottom: 52, alignItems: "center" },
  logo: { width: 80, height: 32, opacity: 0.8 },
});
