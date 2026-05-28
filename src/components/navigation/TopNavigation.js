import { View, Text, StyleSheet } from "react-native";
import { useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";

export function TopNavigation({ activeTab, activeTitle, rightElement }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.titleBlock}>
        <Text style={styles.tabTitle}>{activeTab}</Text>
        <Text style={styles.tabName}>{activeTitle}</Text>
      </View>
      {rightElement && <View style={styles.rightSection}>{rightElement}</View>}
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: {
    minHeight: 90,
    paddingHorizontal: 24,
    paddingBottom: 12,
    backgroundColor: colors.background,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
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
    lineHeight: 16,
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
