import {
  View,
  Text,
  Image,
  FlatList,
  RefreshControl,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ROUTES, fonts } from "@/constants";
import { useTheme } from "@/hooks/useTheme";
import { getFavorites } from "@/services/capsules";
import { normalizeCapsule } from "@/utils/normalize";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/utils/date";

function FavoriteCard({ capsule, onPress, colors, styles }) {
  const textContent = capsule.contents?.find((c) => c.content_type === "text");
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.senderAvatar}>
          {capsule.fromAvatar ? (
            <Image source={{ uri: capsule.fromAvatar }} style={styles.senderAvatarImg} />
          ) : (
            <Text style={styles.senderAvatarText}>{capsule.fromInitial}</Text>
          )}
        </View>
        <View style={styles.senderInfo}>
          <Text style={styles.senderName}>From {capsule.from}</Text>
          <Text style={styles.sealedDate}>Sealed on {formatDate(capsule.sealedAt)}</Text>
        </View>
        <View style={styles.heartGlow}>
          <Ionicons name="heart" size={18} color={colors.primary} />
        </View>
      </View>

      <Text style={styles.capsuleTitle}>{capsule.title}</Text>

      {textContent?.body ? (
        <Text style={styles.messagePreview} numberOfLines={2}>
          {textContent.body}
        </Text>
      ) : null}

      <View style={styles.cardFooter}>
        <View
          style={[
            styles.statusBadge,
            capsule.status === "unlocked" && styles.unlockedBadge,
          ]}
        >
          <Ionicons
            name={capsule.status === "unlocked" ? "lock-open-outline" : "lock-closed-outline"}
            size={12}
            color={capsule.status === "unlocked" ? colors.primary : colors.mutedFg}
          />
          <Text
            style={[
              styles.statusText,
              capsule.status === "unlocked" && { color: colors.primary },
            ]}
          >
            {capsule.status === "unlocked" ? "Unlocked" : "Sealed"}
          </Text>
        </View>
        <Text style={styles.footerDate}>{formatDate(capsule.unlocksAt)}</Text>
      </View>
    </Pressable>
  );
}

function EmptyState({ colors, styles }) {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart-outline" size={52} color={colors.border} />
      <Text style={styles.emptyTitle}>No hearts yet</Text>
      <Text style={styles.emptySubtitle}>
        Capsules you save to heart will appear here
      </Text>
    </View>
  );
}

export default function FavoritesScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [capsules, setCapsules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getFavorites();
      setCapsules(data.map((c) => normalizeCapsule(c, user?.id)));
    } catch (_) {
      setCapsules([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await getFavorites();
      setCapsules(data.map((c) => normalizeCapsule(c, user?.id)));
    } catch (_) {}
    setRefreshing(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCardPress = (capsule) => {
    if (capsule.status === "unlocked") {
      navigation.navigate(ROUTES.UNLOCKED_CAPSULE, { capsule });
    } else {
      navigation.navigate(ROUTES.LOCKED_CAPSULE, { capsule });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <View>
          <Text style={styles.headerSub}>COLLECTION</Text>
          <Text style={styles.headerTitle}>Hearts</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : capsules.length === 0 ? (
        <EmptyState colors={colors} styles={styles} />
      ) : (
        <FlatList
          data={capsules}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <FavoriteCard capsule={item} onPress={() => handleCardPress(item)} colors={colors} styles={styles} />
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
    padding: 20,
    gap: 12,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: 12,
    gap: 12,
  },
  heartGlow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  senderAvatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  senderAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.secondaryBackground,
    borderWidth: 1.5,
    borderColor: `${colors.primary}40`,
    alignItems: "center",
    justifyContent: "center",
  },
  senderAvatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.foreground,
  },
  senderInfo: { flex: 1, gap: 2 },
  senderName: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.foreground,
  },
  sealedDate: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.mutedFg,
  },
  capsuleTitle: {
    fontSize: 20,
    fontWeight: "300",
    color: colors.foreground,
    fontFamily: fonts.serif,
    lineHeight: 28,
  },
  messagePreview: {
    fontSize: 13,
    color: colors.mutedFg,
    lineHeight: 20,
    fontStyle: "italic",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  unlockedBadge: {
    backgroundColor: `${colors.primary}15`,
    borderColor: `${colors.primary}50`,
  },
  statusText: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.mutedFg,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  footerDate: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.mutedFg,
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
