import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
  ActionSheetIOS,
  Modal,
  Platform,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { colors, ROUTES, fonts } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { getProfile, uploadAvatar } from "@/services/user";
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
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [viewingAvatar, setViewingAvatar] = useState(false);

  const load = useCallback(async () => {
    try {
      const [profileData, capsulesData] = await Promise.all([
        getProfile(),
        getCapsules(),
      ]);
      setProfile(profileData);
      if (profileData.avatar) setAvatarUrl(profileData.avatar);
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

  const handleUploadAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Photo library access is needed to update your avatar.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    try {
      setUploadingAvatar(true);
      const { avatar } = await uploadAvatar(result.assets[0].uri);
      setAvatarUrl(avatar);
    } catch {
      Alert.alert("Upload failed", "Could not update your avatar. Please try again.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarPress = () => {
    if (Platform.OS === "ios") {
      const options = avatarUrl
        ? ["View Profile Picture", "Upload New Picture", "Cancel"]
        : ["Upload Profile Picture", "Cancel"];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.length - 1 },
        (index) => {
          if (avatarUrl) {
            if (index === 0) setViewingAvatar(true);
            else if (index === 1) handleUploadAvatar();
          } else {
            if (index === 0) handleUploadAvatar();
          }
        }
      );
    } else {
      const buttons = avatarUrl
        ? [
            { text: "View Profile Picture", onPress: () => setViewingAvatar(true) },
            { text: "Upload New Picture", onPress: handleUploadAvatar },
            { text: "Cancel", style: "cancel" },
          ]
        : [
            { text: "Upload Profile Picture", onPress: handleUploadAvatar },
            { text: "Cancel", style: "cancel" },
          ];
      Alert.alert("Profile Picture", "", buttons);
    }
  };

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
          <Pressable onPress={handleAvatarPress} style={styles.avatarWrapper}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                {loading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarInitial}>{initial}</Text>
                )}
              </View>
            </View>
            <View style={styles.editBadge}>
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color={colors.primaryFg} />
              ) : (
                <Ionicons name="camera" size={14} color={colors.primaryFg} />
              )}
            </View>
          </Pressable>
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

      {/* ── Full-screen avatar viewer ── */}
      <Modal
        visible={viewingAvatar}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingAvatar(false)}
      >
        <View style={styles.avatarViewOverlay}>
          <Pressable style={styles.avatarViewClose} onPress={() => setViewingAvatar(false)}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarViewImage} />
          ) : (
            <View style={styles.avatarViewPlaceholder}>
              <Text style={styles.avatarViewInitial}>{initial}</Text>
            </View>
          )}
        </View>
      </Modal>
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
  avatarWrapper: {
    marginBottom: 14,
  },
  avatarRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    borderColor: `${colors.primary}50`,
    padding: 3,
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
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background,
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
  // ── Avatar viewer modal ──
  avatarViewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarViewClose: {
    position: "absolute",
    top: 56,
    right: 20,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarViewImage: {
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  avatarViewPlaceholder: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.secondaryBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarViewInitial: {
    fontSize: 100,
    fontWeight: "200",
    color: colors.foreground,
  },
});
