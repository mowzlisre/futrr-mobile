import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fonts } from "@/constants";
import { useTheme } from "@/hooks/useTheme";
import { getUserProfile } from "@/services/user";
import { formatDate } from "@/utils/date";

// ─── Capsule mini-card ─────────────────────────────────────────────────────────

function CapsuleMini({ capsule, colors, styles }) {
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

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function UserProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId, username: initialUsername } = route.params ?? {};
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await getUserProfile(userId);
      setProfile(data);
    } catch {
      // show minimal UI
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      const data = await getUserProfile(userId);
      setProfile(data);
    } catch {}
    setRefreshing(false);
  }, [userId]);

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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                {profile?.avatar ? (
                  <Image source={{ uri: profile.avatar }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarInitial}>{initial}</Text>
                )}
              </View>
            </View>
            <Text style={styles.username}>{displayName}</Text>
            {profile?.bio ? (
              <Text style={styles.bio}>{profile.bio}</Text>
            ) : null}
            <View style={styles.capsuleBadge}>
              <Text style={styles.capsuleBadgeText}>
                {profile?.public_capsules?.length ?? 0} Capsules
              </Text>
            </View>
          </View>

          {/* Pinned capsules */}
          {profile?.pinned_capsules?.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>PINNED</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.capsuleList}
              >
                {profile.pinned_capsules.map((c) => (
                  <CapsuleMini key={c.id} capsule={c} colors={colors} styles={styles} />
                ))}
              </ScrollView>
            </>
          )}

          {/* Public capsules */}
          {profile?.public_capsules?.length > 0 && (
            <>
              <View style={[styles.sectionHeader, { marginTop: profile?.pinned_capsules?.length > 0 ? 24 : 0 }]}>
                <Text style={styles.sectionTitle}>PUBLIC CAPSULES</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.capsuleList}
              >
                {profile.public_capsules.map((c) => (
                  <CapsuleMini key={c.id} capsule={c} colors={colors} styles={styles} />
                ))}
              </ScrollView>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
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
    lineHeight: 14,
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
    paddingBottom: 160,
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
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 42,
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
    marginBottom: 10,
  },
  capsuleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1,
    borderColor: `${colors.primary}35`,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 6,
  },
  capsuleBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  sectionHeader: {
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
    lineHeight: 14,
    color: colors.mutedFg,
  },
});
