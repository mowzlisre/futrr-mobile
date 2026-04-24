import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { getQuota } from "@/services/user";

const CARD_ICONS = {
  capsules_per_week: "cube-outline",
  events_per_week: "calendar-outline",
  event_participants: "people-outline",
  recipients_per_capsule: "send-outline",
  atlas_radius: "compass-outline",
  media_per_capsule: "images-outline",
  storage: "cloud-outline",
  favorites: "heart-outline",
};

const CARD_COLORS = [
  "#EAA646",
  "#5C6BC0",
  "#26A69A",
  "#EF5350",
  "#AB47BC",
  "#42A5F5",
  "#66BB6A",
  "#FFA726",
];

export default function QuotaScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const fetchQuota = useCallback(async () => {
    setError(false);
    try {
      const res = await getQuota();
      setData(res);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchQuota(); }, [fetchQuota]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchQuota();
  };

  const formatResetLabel = (q) => {
    if (q.resets === "weekly" && data?.week_resets_at) {
      const reset = new Date(data.week_resets_at);
      const now = new Date();
      const diffMs = reset - now;
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      if (days > 0) return `Resets in ${days}d ${hours}h`;
      if (hours > 0) return `Resets in ${hours}h`;
      return "Resets soon";
    }
    return null;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>
          <View>
            <Text style={styles.headerSub}>USAGE</Text>
            <Text style={styles.headerTitle}>Quota</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingWrap}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.mutedFg} />
          <Text style={styles.errorText}>Could not load quota</Text>
          <Pressable onPress={() => { setLoading(true); fetchQuota(); }} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <View>
          <Text style={styles.headerSub}>USAGE</Text>
          <Text style={styles.headerTitle}>Quota</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Tier badge */}
        {data && (
          <View style={styles.tierRow}>
            <View style={[styles.tierBadge, { backgroundColor: `${colors.primary}20` }]}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
              <Text style={[styles.tierText, { color: colors.primary }]}>
                {(data.tier ?? "free").charAt(0).toUpperCase() + (data.tier ?? "free").slice(1)} Plan
              </Text>
            </View>
            {data.expires_at && (
              <Text style={styles.expiresText}>
                Expires {new Date(data.expires_at).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}

        {/* Quota cards */}
        {data?.quotas?.map((q, i) => {
          const accent = CARD_COLORS[i % CARD_COLORS.length];
          const icon = CARD_ICONS[q.key] || "ellipse-outline";
          const hasProgress = q.used !== null && q.limit !== null;
          const progress = hasProgress ? Math.min(q.used / q.limit, 1) : 0;
          const isAtlas = q.key === "atlas_radius";
          const resetLabel = formatResetLabel(q);

          return (
            <View key={q.key} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconWrap, { backgroundColor: `${accent}18` }]}>
                  <Ionicons name={icon} size={20} color={accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardLabel}>{q.label}</Text>
                  <Text style={styles.cardDesc}>{q.description}</Text>
                </View>
              </View>

              {/* Progress bar for quotas with used + limit */}
              {hasProgress && (
                <View style={styles.progressSection}>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${progress * 100}%`,
                          backgroundColor: progress >= 0.9 ? colors.error : accent,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.progressLabels}>
                    <Text style={styles.progressUsed}>
                      {q.used}{q.unit ? ` ${q.unit}` : ""}
                    </Text>
                    <Text style={styles.progressLimit}>
                      of {q.limit}{q.unit ? ` ${q.unit}` : ""}
                    </Text>
                  </View>
                </View>
              )}

              {/* Per-item limits (no progress, just show the cap) */}
              {!hasProgress && !isAtlas && (
                <View style={styles.limitRow}>
                  <Text style={[styles.limitValue, { color: accent }]}>{q.limit}</Text>
                  <Text style={styles.limitLabel}>max</Text>
                </View>
              )}

              {/* Atlas — special display */}
              {isAtlas && (
                <View style={styles.atlasRow}>
                  <Text style={[styles.limitValue, { color: accent }]}>{q.used}</Text>
                  <Text style={styles.limitLabel}>{q.unit}</Text>
                  <View style={styles.atlasBadge}>
                    <Ionicons name="trending-up" size={12} color="#66BB6A" />
                    <Text style={styles.atlasGrowth}>+{q.growth}/week</Text>
                  </View>
                </View>
              )}

              {/* Reset timer */}
              {resetLabel && (
                <View style={styles.resetRow}>
                  <Ionicons name="time-outline" size={12} color={colors.mutedFg} />
                  <Text style={styles.resetText}>{resetLabel}</Text>
                </View>
              )}
            </View>
          );
        })}

        <Text style={styles.footer}>
          Limits reset every Monday at 00:00 UTC
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
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
      fontSize: 22,
      fontWeight: "300",
      color: colors.foreground,
      textAlign: "center",
    },
    content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40 },

    // Tier
    tierRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    tierBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
    },
    tierText: { fontSize: 14, fontWeight: "600" },
    expiresText: { fontSize: 12, color: colors.mutedFg },

    // Card
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      marginBottom: 12,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 14,
    },
    cardIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    cardLabel: { fontSize: 15, fontWeight: "600", color: colors.foreground },
    cardDesc: { fontSize: 12, color: colors.mutedFg, marginTop: 2 },

    // Progress
    progressSection: { marginTop: 2 },
    progressTrack: {
      height: 8,
      backgroundColor: colors.secondaryBackground,
      borderRadius: 4,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 4,
    },
    progressLabels: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 6,
    },
    progressUsed: { fontSize: 13, fontWeight: "600", color: colors.foreground },
    progressLimit: { fontSize: 12, color: colors.mutedFg },

    // Limit (per-item)
    limitRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
    limitValue: { fontSize: 28, fontWeight: "700" },
    limitLabel: { fontSize: 13, color: colors.mutedFg },

    // Atlas
    atlasRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
    atlasBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: "#66BB6A18",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      marginLeft: 8,
    },
    atlasGrowth: { fontSize: 11, color: "#66BB6A", fontWeight: "600" },

    // Reset
    resetRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    resetText: { fontSize: 11, color: colors.mutedFg },

    footer: {
      textAlign: "center",
      fontSize: 11,
      color: `${colors.mutedFg}88`,
      marginTop: 8,
    },
    errorText: {
      fontSize: 15,
      color: colors.mutedFg,
      marginTop: 12,
      marginBottom: 20,
    },
    retryBtn: {
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: colors.primary,
    },
    retryText: { fontSize: 14, fontWeight: "600", color: colors.primaryFg },
  });
