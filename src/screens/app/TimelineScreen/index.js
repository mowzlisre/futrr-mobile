import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ROUTES, fonts } from "@/constants";
import { useTheme } from "@/hooks/useTheme";
import { getCapsules } from "@/services/capsules";
import { normalizeCapsule } from "@/utils/normalize";
import { formatDate, getDaysUntil } from "@/utils/date";
import { vaultBus } from "@/utils/vaultBus";

// Map content types to their respective icons
function getMediaIcon(capsule) {
  const types = capsule.contentTypes || [];
  if (types.includes("video")) return "videocam-outline";
  if (types.includes("voice")) return "mic-outline";
  if (types.includes("photo")) return "image-outline";
  if (types.includes("text")) return "document-text-outline";
  // Fallback to type-based icon
  if (capsule.type === "COLLECTIVE") return "people-outline";
  return "lock-closed-outline";
}

function TimelineItem({ capsule, isLast, onPress, styles }) {
  const { colors } = useTheme();
  const isUnlocked = capsule.status === "unlocked";
  const daysLeft = getDaysUntil(capsule.unlocksAt);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel={capsule.title}
    >
      {/* Timeline line */}
      <View style={styles.lineColumn}>
        {isUnlocked && <View style={styles.dotGlow} />}
        {!isUnlocked && daysLeft < 30 && <View style={styles.dotGlowSoon} />}
        <View
          style={[
            styles.dot,
            isUnlocked && styles.dotUnlocked,
            !isUnlocked && daysLeft < 30 && styles.dotSoon,
          ]}
        />
        {!isLast && <View style={styles.line} />}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>{formatDate(capsule.unlocksAt)}</Text>
          {isUnlocked ? (
            <View style={styles.unlockedPill}>
              <Ionicons name="lock-open-outline" size={10} color={colors.primary} />
              <Text style={styles.unlockedPillText}>Unlocked</Text>
            </View>
          ) : (
            <View style={styles.soonPill}>
              <Text style={styles.soonPillText}>
                Unlocks in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Ionicons
              name={getMediaIcon(capsule)}
              size={18}
              color={isUnlocked ? colors.primary : colors.mutedFg}
            />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {capsule.title}
            </Text>
            <Text style={styles.cardFrom}>from {capsule.from}</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.mutedFg}
          />
        </View>
      </View>
    </Pressable>
  );
}

export default function TimelineScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [capsules, setCapsules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCapsules();
      const normalized = (data.results ?? data)
        .map(normalizeCapsule)
        .sort((a, b) => new Date(a.unlocksAt) - new Date(b.unlocksAt));
      setCapsules(normalized);
    } catch (_) {
      setCapsules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await getCapsules();
      const normalized = (data.results ?? data)
        .map(normalizeCapsule)
        .sort((a, b) => new Date(a.unlocksAt) - new Date(b.unlocksAt));
      setCapsules(normalized);
    } catch (_) {}
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Listen for new capsules from CreateCapsuleScreen
  useEffect(() => {
    return vaultBus.on((newCapsule) => {
      setCapsules((prev) => {
        const updated = [newCapsule, ...prev.filter((c) => c.id !== newCapsule.id)];
        return updated.sort((a, b) => new Date(a.unlocksAt) - new Date(b.unlocksAt));
      });
    });
  }, []);

  const handleItemPress = (capsule) => {
    if (capsule.status === "unlocked") {
      navigation.navigate(ROUTES.UNLOCKED_CAPSULE, { capsule });
    } else {
      navigation.navigate(ROUTES.LOCKED_CAPSULE, { capsule });
    }
  };

  // Group capsules by year for dynamic year banners
  const years = [...new Set(capsules.map((c) => new Date(c.unlocksAt).getFullYear()))];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
      }
    >
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
      ) : capsules.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="time-outline" size={40} color={colors.border} />
          <Text style={styles.emptyText}>No capsules yet</Text>
        </View>
      ) : years.length === 0 ? null : (
        years.map((year) => {
          const yearCapsules = capsules.filter(
            (c) => new Date(c.unlocksAt).getFullYear() === year
          );
          return (
            <View key={year}>
              <View style={styles.yearBanner}>
                <View style={styles.yearLine} />
                <Text style={styles.yearText}>{year}</Text>
                <View style={styles.yearLine} />
              </View>
              {yearCapsules.map((capsule, index) => (
                <TimelineItem
                  key={capsule.id}
                  capsule={capsule}
                  isLast={index === yearCapsules.length - 1}
                  onPress={() => handleItemPress(capsule)}
                  styles={styles}
                />
              ))}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 120,
  },
  yearBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 20,
  },
  yearLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  yearText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedFg,
    letterSpacing: 2,
    fontWeight: "500",
  },
  item: {
    flexDirection: "row",
    gap: 0,
  },
  lineColumn: {
    width: 40,
    alignItems: "center",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
    borderWidth: 2,
    borderColor: colors.secondaryBackground,
    marginTop: 4,
    zIndex: 2,
  },
  dotGlow: {
    position: "absolute",
    top: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${colors.primary}30`,
    zIndex: 1,
  },
  dotGlowSoon: {
    position: "absolute",
    top: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${colors.secondary || colors.primary}30`,
    zIndex: 1,
  },
  dotUnlocked: {
    backgroundColor: colors.primary,
  },
  dotSoon: {
    backgroundColor: colors.secondary,
  },
  line: {
    flex: 1,
    width: 1.5,
    backgroundColor: colors.border,
    marginTop: 4,
    marginBottom: -8,
  },
  content: {
    flex: 1,
    paddingBottom: 20,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    marginLeft: 4,
  },
  dateText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedFg,
    letterSpacing: 0.3,
  },
  unlockedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${colors.primary}18`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${colors.primary}45`,
  },
  unlockedPillText: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.primary,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  soonPill: {
    backgroundColor: `${colors.secondary}18`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${colors.secondary}45`,
  },
  soonPillText: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.secondary,
    fontWeight: "600",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    marginLeft: 4,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.secondaryBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "300",
    color: colors.foreground,
    fontFamily: fonts.serif,
  },
  cardFrom: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedFg,
  },
  emptyBox: {
    alignItems: "center",
    gap: 12,
    marginTop: 64,
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedFg,
  },
});
