import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
  ActionSheetIOS,
  Modal,
  Platform,
} from "react-native";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { getProfile, uploadAvatar } from "@/services/user";
import { getCapsules } from "@/services/capsules";
import { getCachedList, setCachedList, invalidateList } from "@/utils/capsuleCache";
import * as ImagePicker from "expo-image-picker";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [profile, setProfile] = useState(null);
  const [capsulesCount, setCapsulesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [viewingAvatar, setViewingAvatar] = useState(false);

  const load = useCallback(async (force = false) => {
    try {
      const cachedProfile  = !force && getCachedList("profile");
      const cachedCapsules = !force && getCachedList("vault");

      const [profileData, capsulesData] = await Promise.all([
        cachedProfile  || getProfile().then(d => { setCachedList("profile", d); return d; }),
        cachedCapsules || getCapsules().then(d => { setCachedList("vault",   d); return d; }),
      ]);

      setProfile(profileData);
      if (profileData.avatar) setAvatarUrl(profileData.avatar);
      setCapsulesCount(Array.isArray(capsulesData) ? capsulesData.length : 0);
    } catch {
      // fall back silently
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    invalidateList("profile");
    invalidateList("vault");
    await load(true);
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  const displayUser = profile || user;
  const initial = displayUser?.username?.[0]?.toUpperCase() ?? "?";

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
      setProfile((p) => p ? { ...p, avatar } : p);
      invalidateList("profile");
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

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
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
          <View style={styles.capsuleBadge}>
            <Ionicons name="cube-outline" size={12} color={colors.primary} />
            <Text style={styles.capsuleBadgeText}>{capsulesCount} Capsules</Text>
          </View>
        </View>

        {/* ── Sign Out ── */}
        <Pressable
          onPress={() =>
            Alert.alert("Sign Out", "Are you sure you want to sign out?", [
              { text: "Cancel", style: "cancel" },
              { text: "Sign Out", style: "destructive", onPress: logout },
            ])
          }
          style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.error ?? "#ef4444"} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
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

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 48,
  },
  avatarWrapper: {
    marginBottom: 16,
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: `${colors.primary}50`,
    padding: 3,
  },
  avatar: {
    flex: 1,
    borderRadius: 47,
    backgroundColor: colors.secondaryBackground,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 47,
  },
  avatarInitial: {
    fontSize: 38,
    fontWeight: "300",
    color: colors.foreground,
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background,
  },
  username: {
    fontSize: 24,
    fontWeight: "300",
    color: colors.foreground,
    marginBottom: 4,
  },
  email: {
    fontSize: 13,
    color: colors.mutedFg,
    marginBottom: 14,
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
  },
  capsuleBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${colors.error ?? "#ef4444"}33`,
    backgroundColor: `${colors.error ?? "#ef4444"}0f`,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.error ?? "#ef4444",
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
