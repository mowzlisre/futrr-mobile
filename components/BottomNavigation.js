import { View, Pressable, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRef, useEffect } from "react";
import { colors } from "../conf";

function TabItem({ tab, isActive, onPress }) {
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
      android_ripple={{ color: "rgba(108,99,255,0.18)", borderless: true, radius: 28 }}
    >
      <Animated.View
        style={[
          styles.activeDot,
          {
            opacity,
            shadowColor: colors.primary,
            shadowOpacity: 0.9,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
          },
        ]}
      />
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={isActive ? tab.active : tab.icon}
          size={24}
          color={isActive ? colors.foreground : colors.mutedFg}
        />
      </Animated.View>
    </Pressable>
  );
}

export function BottomNavigation({ activeTab, onTabChange }) {
  const fabScale = useRef(new Animated.Value(1)).current;

    const tabs = [
        { id: "Vault", icon: "albums-outline", label: "Your Capsules", active: "albums" },
        { id: "Discover", icon: "search-outline", label: "Around You", active: "search" },
        { id: "Favorites", icon: "heart-outline", label: "You Liked", active: "heart" },
        { id: "Atlas", icon: "earth-outline", label: "See The World", active: "earth"  },
        { id: "Profile", icon: "earth-outline", label: "See The World", active: "earth", hidden: true } 
    ];

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

  return (
    <View style={styles.container}>
      {/* Pill: 4 nav icons */}
      <BlurView intensity={80} tint="dark" style={styles.navBar}>
        <View/>
        {tabs.map(tab => (
              !tab.hidden && 
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onPress={() => onTabChange(tab)}
          />
        ))}
      </BlurView>

      {/* Round FAB */}
      <Animated.View style={[styles.fabWrapper, { transform: [{ scale: fabScale }] }]}>
        <Pressable
          onPressIn={handleFabPressIn}
          onPressOut={handleFabPressOut}
          style={styles.fab}
        >
          <View style={styles.fabRing} />
          <Ionicons name="add" size={28} color={colors.primaryFg} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
  },
  navBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 60,
    paddingHorizontal: 8,
    borderRadius: 44,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    overflow: "hidden",
    backgroundColor: colors.secondaryBackground,
    color: colors.primary,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  activeDot: {
    position: "absolute",
    top: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: 9.5,
    fontWeight: "600",
    letterSpacing: 0.4,
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
    shadowColor: colors.primary,
    borderColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10
  },
  fabRing: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.22)",
  },
});