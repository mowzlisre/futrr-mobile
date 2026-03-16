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
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts } from "@/constants";
import { getUserProfile, followUser, unfollowUser } from "@/services/user";
import { formatDate } from "@/utils/date";

// ─── Capsule mini-card ─────────────────────────────────────────────────────────

function CapsuleMini({ capsule }) {
  const isUnlocked = capsule.status === "unlocked";
  return (
    <View style={styles.miniCard}>
      <View style={[styles.miniLock, isUnlocked && styles.miniLockUnlocked]}>
        <Ionicons
          name={isUnlocked ? "lock-open-outline" : "lock-closed-outline"}
          size={12}
          color={isUnlocked ? colors.primary : colors.mutedFg}
        />
      </View>
      <Text style={styles.miniTitle} numberOfLines={2}>
        {capsule.title || "Untitled capsule"}
      </Text>
      <Text style={styles.miniDate}>{formatDate(capsule.unlock_at)}</Text>
    </View>
  );
}

// ─── Stat item ────────────────────────────────────────────────────────────────

function StatItem({ value, label }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function UserProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId, username: initialUsername } = route.params ?? {};

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await getUserProfile(userId);
      setProfile(data);
      setFollowing(data.is_following ?? false);
    } catch {
      // show minimal UI
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFollowToggle = async () => {
    if (followLoading) return;
    setFollowLoading(true);
    try {
      if (following) {
        await unfollowUser(userId);
        setFollowing(false);
        setProfile((p) =>
          p ? { ...p, followers_count: Math.max(0, (p.followers_count ?? 1) - 1) } : p
        );
      } else {
        await followUser(userId);
        setFollowing(true);
        setProfile((p) =>
          p ? { ...p, followers_count: (p.followers_count ?? 0) + 1 } : p
        );
      }
    } catch {
      // revert on error
    } finally {
      setFollowLoading(false);
    }
  };

  const displayName = profile?.username ?? initialUsername ?? "User";
  const initial = displayName[0]?.toUpperCase() ?? "?";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <View>
          <Text style={styles.headerSub}>PROFILE</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {displayName}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            </View>
            <Text style={styles.username}>{displayName}</Text>
            {profile?.bio ? (
              <Text style={styles.bio}>{profile.bio}</Text>
            ) : null}
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatItem value={profile?.followers_count ?? 0} label="Followers" />
            <View style={styles.statDivider} />
            <StatItem value={profile?.following_count ?? 0} label="Following" />
            <View style={styles.statDivider} />
            <StatItem
              value={profile?.public_capsules?.length ?? 0}
              label="Capsules"
            />
          </View>

          {/* Follow button */}
          <Pressable
            onPress={handleFollowToggle}
            disabled={followLoading}
            style={({ pressed }) => [
              styles.followBtn,
              following && styles.followBtnActive,
              pressed && { opacity: 0.8 },
            ]}
          >
            {followLoading ? (
              <ActivityIndicator size="small" color={following ? colors.mutedFg : colors.primaryFg} />
            ) : (
              <>
                <Ionicons
                  name={following ? "person-remove-outline" : "person-add-outline"}
                  size={16}
                  color={following ? colors.mutedFg : colors.primaryFg}
                />
                <Text style={[styles.followBtnText, following && styles.followBtnTextActive]}>
                  {following ? "Unfollow" : "Follow"}
                </Text>
              </>
            )}
          </Pressable>

          {/* Public capsules */}
          {profile?.public_capsules?.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>PUBLIC CAPSULES</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.capsuleList}
              >
                {profile.public_capsules.map((c) => (
                  <CapsuleMini key={c.id} capsule={c} />
                ))}
              </ScrollView>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerSub: {
    fontSize: 10,
    color: colors.mutedFg,
    letterSpacing: 2,
    textTransform: "uppercase",
    textAlign: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "300",
    color: colors.foreground,
    textAlign: "center",
    maxWidth: 200,
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
    marginBottom: 6,
  },
  bio: {
    fontSize: 13,
    color: colors.mutedFg,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    marginBottom: 16,
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
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    marginBottom: 32,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  followBtnActive: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  followBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.primaryFg,
  },
  followBtnTextActive: {
    color: colors.mutedFg,
  },
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
  capsuleList: {
    gap: 12,
    paddingRight: 4,
  },
  miniCard: {
    width: 130,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 7,
  },
  miniLock: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.secondaryBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  miniLockUnlocked: {
    backgroundColor: `${colors.primary}18`,
  },
  miniTitle: {
    fontSize: 12,
    fontWeight: "300",
    color: colors.foreground,
    fontFamily: fonts.serif,
    lineHeight: 17,
  },
  miniDate: {
    fontSize: 10,
    color: colors.mutedFg,
  },
});
