import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ROUTES, fonts } from "@/constants";
import { useTheme } from "@/hooks/useTheme";
import { getCapsules } from "@/services/capsules";
import { normalizeCapsule } from "@/utils/normalize";
import { useAuth } from "@/hooks/useAuth";
import { getDaysUntil, formatDate } from "@/utils/date";
import { useAppForeground } from "@/hooks/useAppForeground";
import { vaultBus } from "@/utils/vaultBus";


function StatCard({ value, label, unit, onPress, styles }) {
  const inner = (
    <View style={styles.statCard}>
      <Text style={styles.statValue} adjustsFontSizeToFit numberOfLines={1}>
        {value}{unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
  if (onPress) return <Pressable onPress={onPress} style={styles.statCardWrap} accessibilityRole="button" accessibilityLabel={`View ${label.toLowerCase()} capsule`}>{inner}</Pressable>;
  return <View style={styles.statCardWrap}>{inner}</View>;
}

function CapsuleCard({ capsule, onPress, styles }) {
  const { colors } = useTheme();
  const isUnlocked = capsule.status === "unlocked";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.capsuleCard, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel={capsule.title}
    >
      {/* Header: avatar + sender info + status badge */}
      <View style={styles.cardHeader}>
        <View style={styles.cardAvatar}>
          {capsule.fromAvatar ? (
            <Image source={{ uri: capsule.fromAvatar }} style={styles.cardAvatarImg} />
          ) : (
            <Text style={styles.cardAvatarText}>{capsule.fromInitial}</Text>
          )}
        </View>
        <View style={styles.cardSenderInfo}>
          <Text style={styles.cardSenderName}>From {capsule.from}</Text>
          {capsule.sealedAt ? (
            <Text style={styles.cardSealedDate}>Sealed {formatDate(capsule.sealedAt)}</Text>
          ) : null}
        </View>
        <View style={[styles.statusBadge, !isUnlocked && styles.statusBadgeSealed]}>
          <Ionicons
            name={isUnlocked ? "lock-open-outline" : "lock-closed-outline"}
            size={11}
            color={isUnlocked ? colors.mutedFg : colors.primary}
          />
          <Text style={[styles.statusBadgeText, !isUnlocked && styles.statusBadgeTextSealed]}>
            {isUnlocked ? "Unlocked" : "Sealed"}
          </Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.capsuleTitle} numberOfLines={2}>{capsule.title}</Text>

      {/* Description */}
      {!!capsule.description && (
        <Text style={styles.capsuleDescription} numberOfLines={2}>{capsule.description}</Text>
      )}

      {/* Footer: date pill + type */}
      <View style={styles.cardFooter}>
        <View style={styles.datePill}>
          <Text style={styles.datePillText}>
            {isUnlocked ? "Unlocked " : "Unlocks "}{formatDate(capsule.unlocksAt)}
          </Text>
        </View>
        <Text style={styles.typeLabel}>{capsule.type}</Text>
      </View>
    </Pressable>
  );
}

export default function VaultScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [capsules, setCapsules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadCapsules = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      setError(null);
      const data = await getCapsules();
      const sorted = [...data].sort(
        (a, b) => new Date(b.sealed_at || b.created_at || 0) - new Date(a.sealed_at || a.created_at || 0)
      );
      setCapsules(sorted.map((c) => normalizeCapsule(c, user?.id)));
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

  // Prepend newly created capsules immediately
  useEffect(() => {
    return vaultBus.on((newCapsule) => {
      setCapsules((prev) => [newCapsule, ...prev]);
    });
  }, []);

  const sealed = capsules.filter((c) => c.status === "sealed");
  const unlocked = capsules.filter((c) => c.status === "unlocked");
  const nextOpenDays = sealed.length
    ? Math.min(...sealed.map((c) => getDaysUntil(c.unlocksAt)))
    : 0;
  const nextOpenCapsule = sealed.length
    ? sealed.reduce((nearest, c) => {
        const t = new Date(c.unlocksAt).getTime();
        return t < new Date(nearest.unlocksAt).getTime() ? c : nearest;
      })
    : null;

  // Auto-reload when the nearest sealed capsule's unlock time arrives
  useEffect(() => {
    if (!sealed.length) return;
    const now = Date.now();
    const nearest = sealed.reduce((min, c) => {
      const t = new Date(c.unlocksAt).getTime();
      return t > now && t < min ? t : min;
    }, Infinity);
    if (!isFinite(nearest)) return;
    const timer = setTimeout(() => loadCapsules(), nearest - now + 1500);
    return () => clearTimeout(timer);
  }, [sealed, loadCapsules]);

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
        <StatCard value={sealed.length} label="SEALED" styles={styles} />
        <StatCard value={unlocked.length} label="UNLOCKED" styles={styles} />
        <StatCard
          value={nextOpenDays}
          unit="days"
          label="NEXT OPEN"
          onPress={nextOpenCapsule ? () => navigation.navigate(ROUTES.LOCKED_CAPSULE, { capsule: nextOpenCapsule }) : undefined}
          styles={styles}
        />
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
              styles={styles}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 120,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  statCardWrap: {
    flex: 1,
  },
  statCard: {
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
  statUnit: {
    fontSize: 14,
    fontWeight: "400",
    color: colors.mutedFg,
  },
  statLabel: {
    fontSize: 9,
    lineHeight: 13,
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
    lineHeight: 14,
    color: colors.mutedFg,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "500",
  },
  capsuleList: {
    gap: 12,
  },
  capsuleCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  cardAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondaryBackground,
    borderWidth: 1.5,
    borderColor: `${colors.primary}40`,
    alignItems: "center",
    justifyContent: "center",
  },
  cardAvatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.foreground,
  },
  cardSenderInfo: {
    flex: 1,
    gap: 2,
  },
  cardSenderName: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.foreground,
  },
  cardSealedDate: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.mutedFg,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.secondaryBackground,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusBadgeText: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.mutedFg,
    fontWeight: "500",
  },
  statusBadgeSealed: {
    backgroundColor: `${colors.primary}12`,
    borderColor: `${colors.primary}40`,
  },
  statusBadgeTextSealed: {
    color: colors.primary,
    fontWeight: "600",
  },
  capsuleTitle: {
    fontSize: 16,
    fontWeight: "300",
    color: colors.foreground,
    fontFamily: fonts.serif,
    lineHeight: 23,
  },
  capsuleDescription: {
    fontSize: 12,
    color: colors.mutedFg,
    lineHeight: 18,
    marginTop: -4,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  datePill: {
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${colors.primary}35`,
  },
  datePillText: {
    fontSize: 11,
    lineHeight: 16,
    color: `${colors.primary}CC`,
    fontWeight: "500",
  },
  typeLabel: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.mutedFg,
    letterSpacing: 1,
    textTransform: "uppercase",
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
    lineHeight: 17,
    color: colors.primary,
  },
});
