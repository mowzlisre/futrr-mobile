import { View, Text, Pressable, StyleSheet, Dimensions, Animated } from "react-native";
import { useRef, useEffect, useMemo } from "react";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { useTour } from "@/hooks/useTour";

const { width: SW, height: SH } = Dimensions.get("window");

const FAB_SIZE = 60;

const TOUR_DATA = [
  {
    target: "vault",
    icon: "albums",
    iconSize: 22,
    title: "Vault",
    body: "Your personal vault! This is where all your capsules live — safe, organized, and ready for you whenever you want to revisit them.",
  },
  {
    target: "fab",
    icon: "add",
    iconSize: 28,
    title: "New Capsule",
    body: "Create your own capsules! Write messages, add photos, videos, or audio — anything you want to capture for the future.",
  },
  {
    target: "favorites",
    icon: "heart-outline",
    iconSize: 22,
    title: "Favorites",
    body: "Tap the heart in the Vault header to see capsules you've saved. A special place for the ones you love.",
  },
  {
    target: "discover",
    icon: "search",
    iconSize: 22,
    title: "Discover",
    body: "Explore what others have created! Discover public capsules, upcoming events, or find friends to share and unlock capsules together.",
  },
  {
    target: "atlas",
    icon: "earth-outline",
    iconSize: 24,
    title: "Atlas",
    body: "See capsules come alive on an interactive map! Tap the globe icon in Discover to explore capsules from all over the world.",
  },
  {
    target: "timeline",
    icon: "time",
    iconSize: 22,
    title: "Timeline",
    body: "Your journey, all in one place. Capsules are lined up chronologically — past, present, and future at a glance.",
  },
];

// ─── Tooltip shown after tour ends ──────────────────────────────────────────

const NAV_HPAD = 28;

export function FabTooltip() {
  const { showTooltip, dismissTooltip } = useTour();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    if (showTooltip) {
      opacity.setValue(0);
      translateY.setValue(8);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
          dismissTooltip();
        });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showTooltip]);

  if (!showTooltip) return null;

  const bottomPad = Math.max(insets.bottom, 12);
  const tooltipBottom = bottomPad + FAB_SIZE + 14;

  return (
    <Animated.View
      style={{
        position: "absolute",
        bottom: tooltipBottom,
        right: NAV_HPAD - 10,
        backgroundColor: colors.card,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
        opacity,
        transform: [{ translateY }],
      }}
      pointerEvents="box-none"
    >
      <Pressable onPress={dismissTooltip}>
        <Text style={{ fontSize: 13, color: colors.foreground, fontWeight: "500" }}>
          Start creating memories here
        </Text>
      </Pressable>
      {/* Triangle pointer */}
      <View
        style={{
          position: "absolute",
          bottom: -7,
          right: (NAV_HPAD + FAB_SIZE / 2) - (NAV_HPAD - 10) - 7,
          width: 0,
          height: 0,
          borderLeftWidth: 7,
          borderRightWidth: 7,
          borderTopWidth: 7,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderTopColor: colors.card,
        }}
      />
    </Animated.View>
  );
}

// ─── Main tour overlay (blur + card as separate z-index layers) ─────────────

export function TourOverlay({ onSwitchTab }) {
  const { tourActive, tourStep, nextStep, endTour } = useTour();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (tourActive) {
      fadeAnim.setValue(0);
      contentAnim.setValue(0);
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(contentAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [tourActive]);

  useEffect(() => {
    if (!tourActive) return;
    const step = TOUR_DATA[tourStep];
    if (step.target === "vault" || step.target === "favorites") {
      onSwitchTab?.("The Vault");
    } else if (step.target === "discover" || step.target === "atlas") {
      onSwitchTab?.("Explore");
    } else if (step.target === "timeline") {
      onSwitchTab?.("Timeline");
    }

    contentAnim.setValue(0);
    Animated.timing(contentAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [tourStep]);

  if (!tourActive) return null;

  const current = TOUR_DATA[tourStep];
  const isLast = tourStep === TOUR_DATA.length - 1;

  // Card position — header targets: card below header, bottom targets: card in upper portion
  const isHeaderTarget = current.target === "favorites" || current.target === "atlas";
  const cardTop = isHeaderTarget
    ? insets.top + 100
    : SH * 0.15;

  return (
    <>
      {/* Blur overlay — zIndex 10, sits below elevated icons */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { zIndex: 10, opacity: fadeAnim }]}
        pointerEvents="none"
      >
        <BlurView
          intensity={50}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.45)" }]}
        />
      </Animated.View>

      {/* Content card — zIndex 15, sits above everything */}
      <Animated.View
        style={[
          styles.card,
          {
            top: cardTop,
            zIndex: 15,
            opacity: contentAnim,
            transform: [
              { translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
            ],
          },
        ]}
        pointerEvents="auto"
      >
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            {tourStep + 1} of {TOUR_DATA.length}
          </Text>
          <Pressable onPress={endTour} hitSlop={12}>
            <Text style={styles.skipText}>Skip tour</Text>
          </Pressable>
        </View>

        <View style={styles.iconRow}>
          <View style={styles.iconCircle}>
            <Ionicons name={current.icon} size={24} color={colors.primary} />
          </View>
          <Text style={styles.title}>{current.title}</Text>
        </View>

        <Text style={styles.body}>{current.body}</Text>

        <View style={styles.dotsRow}>
          {TOUR_DATA.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === tourStep ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>

        <Pressable
          onPress={isLast ? endTour : nextStep}
          style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.nextBtnText}>{isLast ? "Get Started" : "Next"}</Text>
          {!isLast && <Ionicons name="arrow-forward" size={16} color={colors.primaryFg} />}
        </Pressable>
      </Animated.View>
    </>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    card: {
      position: "absolute",
      left: 24,
      right: 24,
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 22,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOpacity: 0.3,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    progressRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    progressText: {
      fontSize: 11,
      color: colors.mutedFg,
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    skipText: {
      fontSize: 13,
      color: colors.mutedFg,
    },
    iconRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 10,
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: `${colors.primary}18`,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: 22,
      fontWeight: "300",
      color: colors.foreground,
    },
    body: {
      fontSize: 14,
      lineHeight: 21,
      color: colors.mutedFg,
      marginBottom: 18,
    },
    dotsRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 6,
      marginBottom: 18,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    dotActive: {
      backgroundColor: colors.primary,
      width: 18,
    },
    dotInactive: {
      backgroundColor: `${colors.mutedFg}40`,
    },
    nextBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 14,
    },
    nextBtnText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.primaryFg,
    },
  });
