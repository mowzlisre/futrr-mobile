import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors, ROUTES, fonts } from "@/constants";
import { getCapsules } from "@/services/capsules";
import { normalizeCapsule } from "@/utils/normalize";
import { formatDate, getDaysUntil } from "@/utils/date";

const TYPE_ICONS = {
  MESSAGE: "chatbubble-outline",
  MEDIA: "images-outline",
  MOMENT: "sparkles-outline",
  COLLECTIVE: "people-outline",
};

function TimelineItem({ capsule, isLast, onPress }) {
  const isUnlocked = capsule.status === "unlocked";
  const daysLeft = getDaysUntil(capsule.unlocksAt);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && { opacity: 0.85 }]}
    >
      {/* Timeline line */}
      <View style={styles.lineColumn}>
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
              <Text style={styles.unlockedPillText}>UNLOCKED</Text>
            </View>
          ) : daysLeft < 30 ? (
            <View style={styles.soonPill}>
              <Text style={styles.soonPillText}>{daysLeft}d left</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Ionicons
              name={TYPE_ICONS[capsule.type] || "lock-closed-outline"}
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
  const [capsules, setCapsules] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    load();
  }, [load]);

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
                />
              ))}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
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
    zIndex: 1,
  },
  dotUnlocked: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 6,
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
    color: colors.mutedFg,
    letterSpacing: 0.3,
  },
  unlockedPill: {
    backgroundColor: `${colors.primary}25`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unlockedPillText: {
    fontSize: 9,
    color: colors.primary,
    fontWeight: "700",
    letterSpacing: 1,
  },
  soonPill: {
    backgroundColor: `${colors.secondary}25`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  soonPillText: {
    fontSize: 9,
    color: colors.secondary,
    fontWeight: "700",
    letterSpacing: 1,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    marginLeft: 4,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondaryBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "300",
    color: colors.foreground,
    fontFamily: fonts.serif,
  },
  cardFrom: {
    fontSize: 12,
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
