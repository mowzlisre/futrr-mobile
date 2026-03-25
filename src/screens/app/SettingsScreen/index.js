import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useTour } from "@/hooks/useTour";
import { hapticWarning, hapticLight } from "@/utils/haptics";
import { getProfile, updateProfile, deleteAccount } from "@/services/user";

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { logout } = useAuth();
  const { startTour } = useTour();
  const { colors, isDark, mode, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getProfile()
      .then((data) => setIsPrivate(data.is_private ?? false))
      .catch(() => {});
  }, []);

  const handlePrivacyToggle = async (value) => {
    hapticLight();
    setIsPrivate(value);
    setPrivacyLoading(true);
    try {
      await updateProfile({ is_private: value });
    } catch {
      setIsPrivate(!value);
      Alert.alert("Error", "Could not update privacy setting.");
    } finally {
      setPrivacyLoading(false);
    }
  };

  const handleThemeChange = (newMode) => {
    hapticLight();
    setMode(newMode);
  };

  const handleDeleteAccount = () => {
    hapticWarning();
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account, all your capsules, and all associated media. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = () => {
    Alert.prompt(
      "Confirm Password",
      "Enter your password to confirm account deletion.",
      async (password) => {
        if (!password) return;
        setDeleting(true);
        try {
          await deleteAccount(password);
          await logout();
        } catch (err) {
          setDeleting(false);
          const msg = err?.response?.data?.error || "Could not delete account. Check your password.";
          Alert.alert("Error", msg);
        }
      },
      "secure-text"
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <View>
          <Text style={styles.headerSub}>PROFILE</Text>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* General section */}
        <View style={styles.menuSection}>
          {[
            { icon: "notifications-outline", label: "Notifications" },
            { icon: "help-circle-outline", label: "Help & Support" },
            { icon: "information-circle-outline", label: "About futrr" },
          ].map((item, i, arr) => (
            <View
              key={item.label}
              style={[
                styles.menuItem,
                i === arr.length - 1 && styles.menuItemLast,
              ]}
              accessibilityLabel={item.label}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconWrap}>
                  <Ionicons name={item.icon} size={20} color={colors.mutedFg} />
                </View>
                <Text style={styles.menuItemLabel}>{item.label}</Text>
              </View>
              <Text style={styles.comingSoon}>Coming soon</Text>
            </View>
          ))}
        </View>

        {/* Quick Tour */}
        <Pressable
          onPress={() => { navigation.goBack(); startTour(); }}
          style={({ pressed }) => [styles.tourButton, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Start quick tour"
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIconWrap, { backgroundColor: `${colors.primary}15` }]}>
              <Ionicons name="compass-outline" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.menuItemLabel}>Quick Tour</Text>
              <Text style={styles.menuItemSub}>Replay the app walkthrough</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.mutedFg} />
        </Pressable>

        {/* Appearance section */}
        <Text style={styles.sectionTitle}>APPEARANCE</Text>
        <View style={styles.menuSection}>
          <View style={[styles.menuItem, styles.menuItemLast]}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Ionicons name={isDark ? "moon-outline" : "sunny-outline"} size={20} color={colors.mutedFg} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuItemLabel}>Theme</Text>
                <Text style={styles.menuItemSub}>
                  {mode === "system" ? "Follows system" : isDark ? "Dark theme" : "Light theme"}
                </Text>
              </View>
            </View>
            <View style={styles.segmentedControl}>
              {[
                { value: "light", icon: "sunny-outline" },
                { value: "dark", icon: "moon-outline" },
                { value: "system", icon: "phone-portrait-outline" },
              ].map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => handleThemeChange(opt.value)}
                  style={[
                    styles.segmentOption,
                    mode === opt.value && styles.segmentOptionActive,
                  ]}
                  accessibilityLabel={`${opt.value} theme`}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={opt.icon}
                    size={15}
                    color={mode === opt.value ? colors.primary : colors.mutedFg}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Privacy section */}
        <Text style={styles.sectionTitle}>PRIVACY</Text>
        <View style={styles.menuSection}>
          <View style={[styles.menuItem, styles.menuItemLast]}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.mutedFg} />
              </View>
              <View>
                <Text style={styles.menuItemLabel}>Private Account</Text>
                <Text style={styles.menuItemSub}>
                  {isPrivate ? "Only approved followers see your capsules" : "Anyone can follow you"}
                </Text>
              </View>
            </View>
            {privacyLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Switch
                value={isPrivate}
                onValueChange={handlePrivacyToggle}
                trackColor={{ false: colors.border, true: `${colors.primary}80` }}
                thumbColor={isPrivate ? colors.primary : colors.mutedFg}
                style={{ transform: [{ scale: 0.8 }] }}
                accessibilityLabel="Private account toggle"
                accessibilityRole="switch"
              />
            )}
          </View>
        </View>

        {/* Sign Out */}
        <Pressable
          onPress={() => Alert.alert("Sign Out", "Are you sure you want to sign out?", [{ text: "Cancel", style: "cancel" }, { text: "Sign Out", style: "destructive", onPress: logout }])}
          style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>

        {/* Delete Account */}
        <Pressable
          onPress={handleDeleteAccount}
          disabled={deleting}
          style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Delete account"
        >
          {deleting ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={styles.deleteText}>Delete Account</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.version}>futrr · v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      fontSize: 22,
      fontWeight: "300",
      color: colors.foreground,
      textAlign: "center",
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 32,
    },
    tourButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 10,
      lineHeight: 14,
      color: colors.mutedFg,
      letterSpacing: 2,
      textTransform: "uppercase",
      fontWeight: "500",
      marginBottom: 8,
      marginTop: 4,
      paddingLeft: 4,
    },
    menuSection: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      marginBottom: 20,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuItemLast: {
      borderBottomWidth: 0,
    },
    menuItemLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    menuIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.secondaryBackground,
      alignItems: "center",
      justifyContent: "center",
    },
    menuItemLabel: {
      fontSize: 15,
      color: colors.foreground,
    },
    comingSoon: {
      fontSize: 10,
      lineHeight: 14,
      color: colors.mutedFg,
      fontStyle: "italic",
    },
    menuItemSub: {
      fontSize: 11,
      lineHeight: 16,
      color: colors.mutedFg,
      marginTop: 1,
    },
    logoutButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: `${colors.error}1A`,
      borderRadius: 14,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: `${colors.error}33`,
      marginBottom: 12,
    },
    logoutText: {
      fontSize: 15,
      color: colors.error,
      fontWeight: "500",
    },
    deleteButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      marginBottom: 28,
    },
    deleteText: {
      fontSize: 13,
      color: colors.error,
      opacity: 0.7,
    },
    segmentedControl: {
      flexDirection: "row",
      backgroundColor: colors.secondaryBackground,
      borderRadius: 10,
      padding: 3,
      gap: 2,
    },
    segmentOption: {
      width: 34,
      height: 30,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    segmentOptionActive: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    version: {
      textAlign: "center",
      fontSize: 11,
      lineHeight: 16,
      color: `${colors.mutedFg}66`,
      letterSpacing: 1,
    },
  });
