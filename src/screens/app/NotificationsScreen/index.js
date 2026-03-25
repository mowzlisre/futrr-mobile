import {
  View,
  Text,
  FlatList,
  RefreshControl,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { getNotifications, markNotificationRead } from "@/services/notifications";
import { acceptCapsuleInvitation, declineCapsuleInvitation } from "@/services/capsules";
import { normalizeNotification } from "@/utils/normalize";

function NotificationItem({ item, onPress, onAccept, onDecline, actionBusy, colors, styles }) {
  const isInvite = item.type === "recipient_added" && item.relatedCapsule && !item.read;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.item, !item.read && styles.itemUnread]}
      accessibilityRole="button"
      accessibilityLabel={item.message}
    >
      {/* Avatar */}
      <View style={[styles.avatar, item.fromInitial === "?" && styles.avatarAnon]}>
        {item.fromInitial === "?" ? (
          <Ionicons name="person-outline" size={16} color={colors.mutedFg} />
        ) : (
          <Text style={styles.avatarText}>{item.fromInitial}</Text>
        )}
      </View>

      {/* Content */}
      <View style={styles.itemContent}>
        <Text style={styles.itemMessage}>{item.message}</Text>
        <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
        <Text style={styles.itemTime}>{item.time}</Text>

        {isInvite && (
          <View style={styles.inviteActions}>
            <Pressable
              style={[styles.inviteBtn, styles.acceptBtn]}
              onPress={() => onAccept(item)}
              disabled={actionBusy === item.id}
              accessibilityRole="button"
              accessibilityLabel="Accept invitation"
            >
              {actionBusy === item.id ? (
                <ActivityIndicator size="small" color={colors.primaryFg} />
              ) : (
                <Text style={styles.acceptBtnText}>Accept</Text>
              )}
            </Pressable>
            <Pressable
              style={[styles.inviteBtn, styles.declineBtn]}
              onPress={() => onDecline(item)}
              disabled={actionBusy === item.id}
              accessibilityRole="button"
              accessibilityLabel="Decline invitation"
            >
              <Text style={styles.declineBtnText}>Decline</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Unread dot */}
      {!item.read && !isInvite && <View style={styles.unreadDot} />}
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionBusy, setActionBusy] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const data = await getNotifications();
      setNotifications(data.map(normalizeNotification));
    } catch (_) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await getNotifications();
      setNotifications(data.map(normalizeNotification));
      setError(false);
    } catch (_) {}
    setRefreshing(false);
  }, []);

  const handlePress = async (item) => {
    if (!item.read) {
      await markNotificationRead(item.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      );
    }
  };

  const handleAccept = async (item) => {
    try {
      setActionBusy(item.id);
      await acceptCapsuleInvitation(item.relatedCapsule);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      );
    } catch {
      Alert.alert("Error", "Could not accept invitation.");
    } finally {
      setActionBusy(null);
    }
  };

  const handleDecline = async (item) => {
    try {
      setActionBusy(item.id);
      await declineCapsuleInvitation(item.relatedCapsule);
      setNotifications((prev) => prev.filter((n) => n.id !== item.id));
    } catch {
      Alert.alert("Error", "Could not decline invitation.");
    } finally {
      setActionBusy(null);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <View>
          <Text style={styles.headerSub}>INBOX</Text>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Text style={styles.unreadBannerText}>
            {unreadCount} new {unreadCount === 1 ? "notification" : "notifications"}
          </Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : error ? (
        <Pressable onPress={load} style={styles.errorBox}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.border} />
          <Text style={styles.errorText}>Could not load notifications</Text>
          <Text style={styles.retryText}>Tap to retry</Text>
        </Pressable>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <NotificationItem
              item={item}
              onPress={() => handlePress(item)}
              onAccept={handleAccept}
              onDecline={handleDecline}
              actionBusy={actionBusy}
              colors={colors}
              styles={styles}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="notifications-outline" size={40} color={colors.border} />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
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
  unreadBanner: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: `${colors.primary}15`,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  unreadBannerText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.primary,
    fontWeight: "500",
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    marginBottom: 8,
  },
  itemUnread: {
    borderColor: `${colors.primary}30`,
    backgroundColor: `${colors.primary}06`,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondaryBackground,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: `${colors.primary}40`,
  },
  avatarAnon: {
    borderColor: colors.border,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.foreground,
  },
  itemContent: {
    flex: 1,
    gap: 3,
  },
  itemMessage: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.foreground,
  },
  itemSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedFg,
    fontStyle: "italic",
  },
  itemTime: {
    fontSize: 11,
    lineHeight: 16,
    color: `${colors.mutedFg}99`,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  inviteActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  inviteBtn: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },
  acceptBtn: {
    backgroundColor: colors.primary,
  },
  acceptBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primaryFg,
  },
  declineBtn: {
    backgroundColor: colors.secondaryBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  declineBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.mutedFg,
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
