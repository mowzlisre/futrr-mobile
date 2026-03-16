import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/constants";

export function TopNavigation({ activeTab, activeTitle, rightElement }) {
  return (
    <View style={styles.container}>
      <View style={styles.titleBlock}>
        <Text style={styles.tabTitle}>{activeTab}</Text>
        <Text style={styles.tabName}>{activeTitle}</Text>
      </View>
      {rightElement && <View style={styles.rightSection}>{rightElement}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 90,
    paddingHorizontal: 24,
    backgroundColor: colors.background,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleBlock: {
    gap: 2,
  },
  tabName: {
    fontSize: 28,
    fontWeight: "200",
    color: colors.foreground,
  },
  tabTitle: {
    fontSize: 11,
    fontWeight: "400",
    color: colors.mutedFg,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
