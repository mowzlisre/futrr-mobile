import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useTour } from "@/hooks/useTour";
import { ROUTES } from "@/constants";
import PillButton from "@/components/ui/PillButton";
import { hapticWarning, hapticLight, hapticSuccess } from "@/utils/haptics";
import {
  getProfile,
  updateProfile,
  deleteAccount,
  getQuota,
  createSupportTicket,
} from "@/services/user";

const NOTIF_PREFS = [
  { key: "notify_capsule_created", label: "Capsule Created", sub: "When you create a new capsule", icon: "cube-outline" },
  { key: "notify_friend_request", label: "Friend Requests", sub: "New follow or friend requests", icon: "person-add-outline" },
  { key: "notify_capsule_unlocked", label: "Capsule Unlocked", sub: "When a capsule is unlocked", icon: "lock-open-outline" },
  { key: "notify_capsule_shared", label: "Capsule Shared", sub: "When someone shares a capsule with you", icon: "share-outline" },
  { key: "notify_nearby_capsule", label: "Nearby Capsule Alert", sub: "Capsules near your location", icon: "location-outline" },
];

const TICKET_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "bug", label: "Bug Report" },
  { value: "upgrade", label: "Upgrade Request" },
];

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { logout } = useAuth();
  const { startTour } = useTour();
  const { colors, isDark, mode, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [isPrivate, setIsPrivate] = useState(false);
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState({});
  const [notifLoading, setNotifLoading] = useState({});

  // Quota
  const [quota, setQuota] = useState(null);

  // Support ticket modal
  const [ticketVisible, setTicketVisible] = useState(false);
  const [ticketCategory, setTicketCategory] = useState("general");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketSubmitting, setTicketSubmitting] = useState(false);

  useEffect(() => {
    getProfile()
      .then((data) => {
        setIsPrivate(data.is_private ?? false);
        const prefs = {};
        NOTIF_PREFS.forEach(({ key }) => { prefs[key] = data[key] ?? true; });
        setNotifPrefs(prefs);
      })
      .catch(() => {});

    getQuota()
      .then(setQuota)
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

  const handleNotifToggle = useCallback(async (key, value) => {
    hapticLight();
    setNotifPrefs((prev) => ({ ...prev, [key]: value }));
    setNotifLoading((prev) => ({ ...prev, [key]: true }));
    try {
      await updateProfile({ [key]: value });
    } catch {
      setNotifPrefs((prev) => ({ ...prev, [key]: !value }));
      Alert.alert("Error", "Could not update notification setting.");
    } finally {
      setNotifLoading((prev) => ({ ...prev, [key]: false }));
    }
  }, []);

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
        { text: "Delete", style: "destructive", onPress: confirmDelete },
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

  const handleSubmitTicket = async () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      Alert.alert("Missing fields", "Please fill in subject and message.");
      return;
    }
    setTicketSubmitting(true);
    try {
      await createSupportTicket({
        category: ticketCategory,
        subject: ticketSubject.trim(),
        message: ticketMessage.trim(),
      });
      hapticSuccess();
      setTicketVisible(false);
      setTicketSubject("");
      setTicketMessage("");
      setTicketCategory("general");
      Alert.alert("Sent", "Your support ticket has been submitted.");
    } catch {
      Alert.alert("Error", "Could not submit ticket. Please try again.");
    } finally {
      setTicketSubmitting(false);
    }
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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Quota */}
        <Pressable
          onPress={() => navigation.navigate(ROUTES.QUOTA)}
          style={({ pressed }) => [styles.tourButton, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="View quota"
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIconWrap, { backgroundColor: `${colors.primary}15` }]}>
              <Ionicons name="speedometer-outline" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.menuItemLabel}>Quota & Limits</Text>
              <Text style={styles.menuItemSub}>
                {quota ? `${quota.tier.charAt(0).toUpperCase() + quota.tier.slice(1)} plan` : "View your usage limits"}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.mutedFg} />
        </Pressable>

        {/* Notifications section */}
        <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
        <View style={styles.menuSection}>
          {NOTIF_PREFS.map((pref, i) => (
            <View
              key={pref.key}
              style={[styles.menuItem, i === NOTIF_PREFS.length - 1 && styles.menuItemLast]}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconWrap}>
                  <Ionicons name={pref.icon} size={20} color={colors.mutedFg} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuItemLabel}>{pref.label}</Text>
                  <Text style={styles.menuItemSub}>{pref.sub}</Text>
                </View>
              </View>
              {notifLoading[pref.key] ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Switch
                  value={notifPrefs[pref.key] ?? true}
                  onValueChange={(v) => handleNotifToggle(pref.key, v)}
                  trackColor={{ false: colors.border, true: `${colors.primary}80` }}
                  thumbColor={notifPrefs[pref.key] ? colors.primary : colors.mutedFg}
                  style={{ transform: [{ scale: 0.8 }] }}
                />
              )}
            </View>
          ))}
        </View>

        {/* Help & Support */}
        <Text style={styles.sectionTitle}>HELP & SUPPORT</Text>
        <Pressable
          onPress={() => setTicketVisible(true)}
          style={({ pressed }) => [styles.tourButton, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Contact support"
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIconWrap, { backgroundColor: `${colors.primary}15` }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.menuItemLabel}>Contact Support</Text>
              <Text style={styles.menuItemSub}>Send a ticket for help or upgrades</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.mutedFg} />
        </Pressable>

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
        <PillButton
          label="Sign Out"
          variant="danger"
          fullWidth
          onPress={() => Alert.alert("Sign Out", "Are you sure you want to sign out?", [{ text: "Cancel", style: "cancel" }, { text: "Sign Out", style: "destructive", onPress: logout }])}
        />

        {/* Delete Account */}
        <PillButton
          label="Delete Account"
          variant="ghost"
          fullWidth
          loading={deleting}
          onPress={handleDeleteAccount}
        />

        <Text style={styles.version}>futrr · v1.0.0</Text>
      </ScrollView>

      {/* Support Ticket Modal */}
      <Modal visible={ticketVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: colors.background }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setTicketVisible(false)}>
                <Text style={[styles.modalCancel, { color: colors.mutedFg }]}>Cancel</Text>
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Ticket</Text>
              <Pressable onPress={handleSubmitTicket} disabled={ticketSubmitting}>
                {ticketSubmitting ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.modalSend, { color: colors.primary }]}>Send</Text>
                )}
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
              {/* Category picker */}
              <Text style={[styles.fieldLabel, { color: colors.mutedFg }]}>CATEGORY</Text>
              <View style={styles.categoryRow}>
                {TICKET_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.value}
                    onPress={() => { hapticLight(); setTicketCategory(cat.value); }}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: ticketCategory === cat.value ? `${colors.primary}20` : colors.card,
                        borderColor: ticketCategory === cat.value ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: ticketCategory === cat.value ? colors.primary : colors.foreground,
                        fontWeight: ticketCategory === cat.value ? "600" : "400",
                      }}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Subject */}
              <Text style={[styles.fieldLabel, { color: colors.mutedFg }]}>SUBJECT</Text>
              <TextInput
                style={[styles.textInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
                value={ticketSubject}
                onChangeText={setTicketSubject}
                placeholder="Brief summary"
                placeholderTextColor={colors.mutedFg}
                maxLength={200}
              />

              {/* Message */}
              <Text style={[styles.fieldLabel, { color: colors.mutedFg }]}>MESSAGE</Text>
              <TextInput
                style={[styles.textArea, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
                value={ticketMessage}
                onChangeText={setTicketMessage}
                placeholder="Describe your issue or request..."
                placeholderTextColor={colors.mutedFg}
                multiline
                textAlignVertical="top"
              />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
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
    // Modal styles
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: "600",
    },
    modalCancel: {
      fontSize: 15,
    },
    modalSend: {
      fontSize: 15,
      fontWeight: "600",
    },
    fieldLabel: {
      fontSize: 10,
      letterSpacing: 2,
      fontWeight: "500",
      marginBottom: 8,
      paddingLeft: 4,
    },
    categoryRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 20,
    },
    categoryChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
    },
    textInput: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      marginBottom: 20,
    },
    textArea: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      minHeight: 140,
      marginBottom: 20,
    },
  });
