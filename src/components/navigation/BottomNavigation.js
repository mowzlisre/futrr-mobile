import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRef, useEffect, useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TABS, ROUTES } from "@/constants";
import { useTheme } from "@/hooks/useTheme";
import { hapticLight, hapticMedium } from "@/utils/haptics";

const TABS_CONFIG = [
  { id: TABS.VAULT, icon: "albums-outline", label: "Your Capsules", active: "albums", name: "Vault" },
  { id: TABS.DISCOVER, icon: "search-outline", label: "Around You", active: "search", name: "Discover" },
  { id: TABS.TIMELINE, icon: "time-outline", label: "Your Timeline", active: "time", name: "Timeline" },
  { id: TABS.PROFILE, icon: "person-outline", label: "Your Profile", active: "person", name: "Profile" },
];

function TabItem({ tab, isActive, onPress, colors, styles }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isActive ? 1.15 : 1,
      useNativeDriver: true,
      tension: 180,
      friction: 12,
    }).start();
    Animated.timing(opacity, {
      toValue: isActive ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isActive]);

  return (
    <Pressable
      onPress={onPress}
      style={styles.tab}
      android_ripple={{ color: "rgba(234,166,70,0.18)", borderless: true, radius: 28 }}
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: isActive }}
    >
      <Animated.View
        style={[
          styles.activeDot,
          { opacity },
        ]}
      />
      <Animated.View style={{ transform: [{ scale }], alignItems: "center" }}>
        <Ionicons
          name={isActive ? tab.active : tab.icon}
          size={20}
          color={isActive ? colors.foreground : colors.mutedFg}
        />
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
          {tab.name}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function BottomNavigation({ activeTab, onTabChange }) {
  const fabScale = useRef(new Animated.Value(1)).current;
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const handleFabPressIn = () => {
    Animated.spring(fabScale, {
      toValue: 0.88,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  };

  const handleFabPressOut = () => {
    Animated.spring(fabScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  };

  const handleFabPress = () => {
    hapticMedium();
    navigation.navigate(ROUTES.CREATE_CAPSULE);
  };

  const bottomPad = Math.max(insets.bottom, 12);

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      {/* Pill with 4 icons */}
      <BlurView intensity={isDark ? 60 : 80} tint={isDark ? "dark" : "light"} style={styles.navBar}>
        {TABS_CONFIG.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onPress={() => { hapticLight(); onTabChange(tab); }}
            colors={colors}
            styles={styles}
          />
        ))}
      </BlurView>

      {/* Separate rounded FAB */}
      <Animated.View style={[styles.fabWrapper, { transform: [{ scale: fabScale }] }]}>
        <Pressable
          onPressIn={handleFabPressIn}
          onPressOut={handleFabPressOut}
          onPress={handleFabPress}
          style={styles.fab}
          accessibilityRole="button"
          accessibilityLabel="Create new capsule"
        >
          <View style={styles.fabRing} />
          <Ionicons name="add" size={28} color={colors.primaryFg} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const makeStyles = (colors, isDark) => StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 28,
  },
  navBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    paddingHorizontal: 8,
    borderRadius: 54,
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? "rgba(255,255,255,0.12)" : "transparent",
    overflow: "hidden",
    backgroundColor: isDark ? "rgba(26, 24, 38, 0.55)" : "rgba(255, 255, 255, 0.21)",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 9,
    lineHeight: 13,
    color: colors.mutedFg,
    marginTop: 3,
    letterSpacing: 0.3,
    fontWeight: "500",
  },
  tabLabelActive: {
    color: colors.foreground,
  },
  activeDot: {
    position: "absolute",
    top: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  fabWrapper: {
    width: 60,
    height: 60,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  fabRing: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: isDark ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.35)",
  },
});
