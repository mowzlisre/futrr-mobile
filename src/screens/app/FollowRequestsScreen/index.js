import {
  View,
  Text,
  Image,
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
import { getFollowRequests, acceptFollowRequest, rejectFollowRequest } from "@/services/user";

function RequestRow({ item, onAccept, onReject, busy, colors, styles }) {
  const initial = item.from_user?.username?.[0]?.toUpperCase() ?? "?";
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        {item.from_user?.avatar ? (
          <Image source={{ uri: item.from_user.avatar }} style={styles.avatarImg} />
        ) : (
          <Text style={styles.avatarText}>{initial}</Text>
        )}
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowUsername}>{item.from_user?.username}</Text>
        {item.from_user?.bio ? (
          <Text style={styles.rowBio} numberOfLines={1}>
            {item.from_user.bio}
          </Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Pressable
          style={[styles.actionBtn, styles.acceptBtn]}
          onPress={() => onAccept(item)}
          disabled={busy === item.id}
        >
          {busy === item.id ? (
            <ActivityIndicator size="small" color={colors.primaryFg} />
          ) : (
            <Ionicons name="checkmark" size={16} color={colors.primaryFg} />
          )}
        </Pressable>
        <Pressable
          style={[styles.actionBtn, styles.rejectBtn]}
          onPress={() => onReject(item)}
          disabled={busy === item.id}
        >
          <Ionicons name="close" size={16} color={colors.mutedFg} />
        </Pressable>
      </View>
    </View>
  );
}

function EmptyState({ colors, styles }) {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={48} color={colors.border} />
      <Text style={styles.emptyTitle}>No requests</Text>
      <Text style={styles.emptySubtitle}>
        Pending follow requests will appear here
      </Text>
    </View>
  );
}

export default function FollowRequestsScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const data = await getFollowRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch {
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
      const data = await getFollowRequests();
      setRequests(Array.isArray(data) ? data : []);
      setError(false);
    } catch {}
    setRefreshing(false);
  }, []);

  const handleAccept = async (req) => {
    try {
      setBusy(req.id);
      await acceptFollowRequest(req.id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch {
      Alert.alert("Error", "Could not accept request.");
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async (req) => {
    try {
      setBusy(req.id);
      await rejectFollowRequest(req.id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch {
      Alert.alert("Error", "Could not remove request.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <View>
          <Text style={styles.headerSub}>PROFILE</Text>
          <Text style={styles.headerTitle}>Follow Requests</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : error ? (
        <Pressable onPress={load} style={styles.errorBox}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.border} />
          <Text style={styles.errorText}>Could not load requests</Text>
          <Text style={styles.retryText}>Tap to retry</Text>
        </Pressable>
      ) : requests.length === 0 ? (
        <EmptyState colors={colors} styles={styles} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <RequestRow
              item={item}
              onAccept={handleAccept}
              onReject={handleReject}
              busy={busy}
              colors={colors}
              styles={styles}
            />
          )}
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
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondaryBackground,
    borderWidth: 1.5,
    borderColor: `${colors.primary}40`,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.foreground,
  },
  rowInfo: {
    flex: 1,
  },
  rowUsername: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.foreground,
  },
  rowBio: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedFg,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  acceptBtn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rejectBtn: {
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.border,
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
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "300",
    color: colors.foreground,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.mutedFg,
    textAlign: "center",
    lineHeight: 22,
  },
});
