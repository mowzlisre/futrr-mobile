import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors, ROUTES, fonts } from "@/constants";
import { getCapsules } from "@/services/capsules";
import { normalizeCapsule } from "@/utils/normalize";
import { useAuth } from "@/hooks/useAuth";
import { getDaysUntil, formatDate } from "@/utils/date";
import { useAppForeground } from "@/hooks/useAppForeground";

const TYPE_COLORS = {
  MESSAGE: { bg: `${colors.primary}20`, text: colors.primary },
  MEDIA: { bg: "rgba(150,100,200,0.2)", text: "#9664C8" },
  MOMENT: { bg: `${colors.primary}30`, text: colors.primary },
  COLLECTIVE: { bg: "rgba(100,160,220,0.2)", text: "#64A0DC" },
};

function StatCard({ value, label }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function CapsuleCard({ capsule, onPress }) {
  const isUnlocked = capsule.status === "unlocked";
  const daysUntil = getDaysUntil(capsule.unlocksAt);
  const typeColor = TYPE_COLORS[capsule.type] || TYPE_COLORS.MESSAGE;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.capsuleCard,
        isUnlocked && styles.capsuleCardUnlocked,
        pressed && { opacity: 0.85 },
      ]}
    >
      {/* Left: lock icon */}
      <View style={[styles.capsuleLockIcon, isUnlocked && styles.capsuleLockIconUnlocked]}>
        <Ionicons
          name={isUnlocked ? "lock-open-outline" : "lock-closed-outline"}
          size={18}
          color={isUnlocked ? colors.primary : colors.mutedFg}
        />
      </View>

      {/* Center: info */}
      <View style={styles.capsuleInfo}>
        <Text style={styles.capsuleTitle} numberOfLines={1}>
          {capsule.title}
        </Text>
        <View style={styles.capsuleMeta}>
          <Text style={styles.capsuleFrom}>from {capsule.from}</Text>
          <Text style={styles.capsuleDot}>·</Text>
          <Text style={styles.capsuleDate}>{formatDate(capsule.unlocksAt)}</Text>
        </View>
      </View>

      {/* Right: type tag + days */}
      <View style={styles.capsuleRight}>
        <View style={[styles.typeTag, { backgroundColor: typeColor.bg }]}>
          <Text style={[styles.typeTagText, { color: typeColor.text }]}>{capsule.type}</Text>
        </View>
        {isUnlocked ? (
          <Text style={styles.tapReveal}>Tap to reveal</Text>
        ) : (
          <Text style={styles.daysText}>
            <Text style={styles.daysNumber}>{daysUntil}</Text>
            <Text style={styles.daysLabel}> d</Text>
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export default function VaultScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [capsules, setCapsules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadCapsules = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      setError(null);
      const data = await getCapsules();
      setCapsules(data.map((c) => normalizeCapsule(c, user?.id)));
    } catch (err) {
      setError("Could not load capsules");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadCapsules();
  }, [loadCapsules]);

  // Re-fetch when app comes back to foreground
  useAppForeground(() => loadCapsules());

  const sealed = capsules.filter((c) => c.status === "sealed");
  const unlocked = capsules.filter((c) => c.status === "unlocked");
  const nextOpenDays = sealed.length
    ? Math.min(...sealed.map((c) => getDaysUntil(c.unlocksAt)))
    : 0;

  const handleCapsulePress = (capsule) => {
    if (capsule.status === "unlocked") {
      navigation.navigate(ROUTES.UNLOCKED_CAPSULE, { capsule });
    } else {
      navigation.navigate(ROUTES.LOCKED_CAPSULE, { capsule });
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadCapsules(true)}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatCard value={sealed.length} label="SEALED" />
        <StatCard value={unlocked.length} label="UNLOCKED" />
        <StatCard value={nextOpenDays} label="NEXT OPEN" />
      </View>

      {/* Capsules Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>TIME CAPSULES</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : error ? (
        <Pressable onPress={loadCapsules} style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.retryText}>Tap to retry</Text>
        </Pressable>
      ) : capsules.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="lock-closed-outline" size={40} color={colors.border} />
          <Text style={styles.emptyText}>No capsules yet</Text>
        </View>
      ) : (
        <View style={styles.capsuleList}>
          {capsules.map((capsule) => (
            <CapsuleCard
              key={capsule.id}
              capsule={capsule}
              onPress={() => handleCapsulePress(capsule)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  statValue: {
    fontSize: 26,
    fontWeight: "600",
    color: colors.foreground,
  },
  statLabel: {
    fontSize: 9,
    color: colors.mutedFg,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 10,
    color: colors.mutedFg,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "500",
  },
  capsuleList: {
    gap: 8,
  },
  capsuleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  capsuleCardUnlocked: {
    borderColor: `${colors.primary}45`,
    backgroundColor: `${colors.primary}07`,
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  capsuleLockIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondaryBackground,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  capsuleLockIconUnlocked: {
    backgroundColor: `${colors.primary}18`,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  capsuleInfo: {
    flex: 1,
    gap: 4,
  },
  capsuleTitle: {
    fontSize: 15,
    fontWeight: "300",
    color: colors.foreground,
    fontFamily: fonts.serif,
  },
  capsuleMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  capsuleFrom: {
    fontSize: 12,
    color: colors.mutedFg,
  },
  capsuleDot: {
    fontSize: 12,
    color: colors.mutedFg,
  },
  capsuleDate: {
    fontSize: 12,
    color: colors.mutedFg,
  },
  capsuleRight: {
    alignItems: "flex-end",
    gap: 6,
    marginLeft: 8,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeTagText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  daysText: {
    fontSize: 13,
  },
  daysNumber: {
    color: colors.foreground,
    fontWeight: "600",
  },
  daysLabel: {
    color: colors.mutedFg,
    fontSize: 11,
  },
  tapReveal: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "500",
  },
  emptyBox: {
    alignItems: "center",
    gap: 12,
    marginTop: 48,
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedFg,
  },
  errorBox: {
    alignItems: "center",
    gap: 8,
    marginTop: 48,
  },
  errorText: {
    fontSize: 14,
    color: colors.mutedFg,
  },
  retryText: {
    fontSize: 12,
    color: colors.primary,
  },
});
