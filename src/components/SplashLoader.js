import { View, Text, Image, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/useTheme";

export default function SplashLoader() {
  const { colors, isDark } = useTheme();

  const logo = isDark
    ? require("../../assets/futrr-light.png")
    : require("../../assets/futrr-light.png");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.center}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          One Moment!
        </Text>
      </View>
      <View style={styles.bottom}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "300",
    letterSpacing: 1,
  },
  bottom: {
    paddingBottom: 52,
    alignItems: "center",
  },
  logo: {
    width: 80,
    height: 32,
    opacity: 0.5,
  },
});
