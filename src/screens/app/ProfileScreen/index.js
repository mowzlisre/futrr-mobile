import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors, ROUTES, fonts } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { getProfile } from "@/services/user";
import { getCapsules } from "@/services/capsules";
import { normalizeCapsule } from "@/utils/normalize";
import { formatDate } from "@/utils/date";

// ─── Pinned capsule card ───────────────────────────────────────────────────────

function PinnedCard({ capsule, onPress }) {
  const isUnlocked = capsule.status === "unlocked";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pinnedCard, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.pinnedLock, isUnlocked && styles.pinnedLockUnlocked]}>
        <Ionicons
          name={isUnlocked ? "lock-open-outline" : "lock-closed-outline"}
          size={14}
          color={isUnlocked ? colors.primary : colors.mutedFg}
        />
      </View>
      <Text style={styles.pinnedTitle} numberOfLines={2}>
        {capsule.title}
      </Text>
      <Text style={styles.pinnedDate}>{formatDate(capsule.unlocksAt)}</Text>
    </Pressable>
  );
}

// ─── Stat button (tappable) ────────────────────────────────────────────────────

function StatItem({ value, label, onPress }) {
  return (
    <Pressable style={styles.statItem} onPress={onPress}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [capsules, setCapsules] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [profileData, capsulesData] = await Promise.all([
        getProfile(),
        getCapsules(),
      ]);
      setProfile(profileData);
      setCapsules(capsulesData.map((c) => normalizeCapsule(c, user?.id)));
    } catch {
      // fall back silently
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const displayUser = profile || user;
  const followers = profile?.followers_count ?? 0;
  const following = profile?.following_count ?? 0;
  const capsulesCount = capsules.length;
  const initial = displayUser?.username?.[0]?.toUpperCase() ?? "?";

  const navigation = useNavigation();

  const handleCapsulePress = (capsule) => {
    if (capsule.status === "unlocked") {
      navigation.navigate(ROUTES.UNLOCKED_CAPSULE, { capsule });
    } else {
      navigation.navigate(ROUTES.LOCKED_CAPSULE, { capsule });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar + name ── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              {loading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.avatarInitial}>{initial}</Text>
              )}
            </View>
          </View>
          <Text style={styles.username}>{displayUser?.username || "Your Name"}</Text>
          <Text style={styles.email}>{displayUser?.email || "you@futrr.app"}</Text>
        </View>

        {/* ── Instagram-style stats ── */}
        <View style={styles.statsRow}>
          <StatItem value={followers} label="Followers" />
          <View style={styles.statDivider} />
          <StatItem value={following} label="Following" />
          <View style={styles.statDivider} />
          <StatItem value={capsulesCount} label="Capsules" />
        </View>

        {/* ── Capsules section ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>MY CAPSULES</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : capsules.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="lock-closed-outline" size={32} color={colors.border} />
            <Text style={styles.emptyText}>No capsules yet</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pinnedList}
          >
            {capsules.map((capsule) => (
              <PinnedCard
                key={capsule.id}
                capsule={capsule}
                onPress={() => handleCapsulePress(capsule)}
              />
            ))}
          </ScrollView>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    borderColor: `${colors.primary}50`,
    padding: 3,
    marginBottom: 14,
  },
  avatar: {
    flex: 1,
    borderRadius: 42,
    backgroundColor: colors.secondaryBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 34,
    fontWeight: "300",
    color: colors.foreground,
  },
  username: {
    fontSize: 22,
    fontWeight: "300",
    color: colors.foreground,
    marginBottom: 4,
  },
  email: {
    fontSize: 13,
    color: colors.mutedFg,
  },
  // ── Instagram stats row ──
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    marginBottom: 32,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "600",
    color: colors.foreground,
  },
  statLabel: {
    fontSize: 11,
    color: colors.mutedFg,
    marginTop: 3,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  // ── Capsules section ──
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 10,
    color: colors.mutedFg,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "500",
  },
  pinnedList: {
    gap: 12,
    paddingRight: 4,
  },
  pinnedCard: {
    width: 140,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  pinnedLock: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.secondaryBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  pinnedLockUnlocked: {
    backgroundColor: `${colors.primary}18`,
  },
  pinnedTitle: {
    fontSize: 13,
    fontWeight: "300",
    color: colors.foreground,
    fontFamily: fonts.serif,
    lineHeight: 18,
  },
  pinnedDate: {
    fontSize: 10,
    color: colors.mutedFg,
  },
  emptyBox: {
    alignItems: "center",
    gap: 10,
    marginTop: 32,
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedFg,
  },
});
