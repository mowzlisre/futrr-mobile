import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useState, useRef, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Audio } from "expo-av";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts } from "@/constants";
import { formatDate } from "@/utils/date";
import { getCapsule, toggleFavorite } from "@/services/capsules";
import { normalizeCapsule } from "@/utils/normalize";
import { useAuth } from "@/hooks/useAuth";
import { getCachedCapsule, setCachedCapsule } from "@/utils/capsuleCache";

// ─── Content renderers ────────────────────────────────────────────────────────

function TextContent({ body }) {
  return (
    <View style={contentStyles.messageCard}>
      <Text style={contentStyles.messageText}>{body}</Text>
    </View>
  );
}

function PhotoContent({ url }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <View style={contentStyles.photoContainer}>
      {loading && !error && (
        <ActivityIndicator
          style={StyleSheet.absoluteFill}
          color={colors.primary}
        />
      )}
      {error ? (
        <View style={contentStyles.photoError}>
          <Ionicons name="image-outline" size={32} color={colors.mutedFg} />
          <Text style={contentStyles.photoErrorText}>Could not load image</Text>
        </View>
      ) : (
        <Image
          source={{ uri: url }}
          style={contentStyles.photo}
          resizeMode="cover"
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
        />
      )}
    </View>
  );
}

function VoiceContent({ url, duration }) {
  const soundRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (loading) return;
    if (playing) {
      await soundRef.current?.pauseAsync();
      setPlaying(false);
      return;
    }
    try {
      setLoading(true);
      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true }
        );
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((s) => {
          if (s.didJustFinish) {
            setPlaying(false);
            soundRef.current = null;
          }
        });
      } else {
        await soundRef.current.playAsync();
      }
      setPlaying(true);
    } catch (_) {
      // ignore playback errors silently
    } finally {
      setLoading(false);
    }
  };

  const label = duration
    ? `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`
    : "Voice note";

  return (
    <Pressable onPress={toggle} style={contentStyles.voiceCard}>
      <View style={contentStyles.voiceIconWrap}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons
            name={playing ? "pause" : "play"}
            size={22}
            color={colors.primary}
          />
        )}
      </View>
      <View style={contentStyles.voiceInfo}>
        <Text style={contentStyles.voiceLabel}>Voice Note</Text>
        <Text style={contentStyles.voiceDuration}>{label}</Text>
      </View>
      <Ionicons name="mic-outline" size={18} color={colors.mutedFg} />
    </Pressable>
  );
}

function ContentBlock({ item }) {
  if (item.content_type === "text") return <TextContent body={item.body} />;
  if (item.content_type === "photo") return <PhotoContent url={item.url} />;
  if (item.content_type === "voice")
    return <VoiceContent url={item.url} duration={item.duration} />;
  return null;
}

const contentStyles = StyleSheet.create({
  messageCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  messageText: {
    fontSize: 15,
    fontWeight: "300",
    color: colors.foreground,
    lineHeight: 24,
    fontStyle: "italic",
    fontFamily: fonts.serif,
  },
  photoContainer: {
    width: "100%",
    height: 240,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoError: {
    alignItems: "center",
    gap: 8,
  },
  photoErrorText: {
    fontSize: 13,
    color: colors.mutedFg,
  },
  voiceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  voiceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.primary}18`,
    borderWidth: 1.5,
    borderColor: `${colors.primary}40`,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceInfo: {
    flex: 1,
  },
  voiceLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.foreground,
  },
  voiceDuration: {
    fontSize: 12,
    color: colors.mutedFg,
    marginTop: 2,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function UnlockedCapsuleScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { capsule: initialCapsule } = route.params;

  const [capsule, setCapsule] = useState(initialCapsule);
  const [loadingContents, setLoadingContents] = useState(
    !initialCapsule.contents?.length
  );
  const [favorited, setFavorited] = useState(initialCapsule.isFavorited ?? false);
  const [toggling, setToggling] = useState(false);

  // If the capsule came from the vault list it won't have contents (list
  // endpoint omits them). Check cache first, then fetch if needed.
  useEffect(() => {
    if (initialCapsule.contents?.length) return; // already have contents
    const capsuleId = initialCapsule._id || initialCapsule.id;
    const cached = getCachedCapsule(capsuleId);
    if (cached) {
      setCapsule(normalizeCapsule(cached, user?.id));
      setFavorited(cached.is_favorited ?? false);
      setLoadingContents(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const raw = await getCapsule(capsuleId);
        setCachedCapsule(capsuleId, raw);
        if (!cancelled) {
          setCapsule(normalizeCapsule(raw, user?.id));
          setFavorited(raw.is_favorited ?? false);
        }
      } catch (_) {
        // silently fail — show whatever we already have
      } finally {
        if (!cancelled) setLoadingContents(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const contents = capsule.contents ?? [];

  const handleToggleFavorite = async () => {
    if (toggling) return;
    try {
      setToggling(true);
      const res = await toggleFavorite(capsule._id || capsule.id);
      setFavorited(res.favorited);
    } catch (_) {
      // keep current state
    } finally {
      setToggling(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <View style={styles.unlockedBadge}>
          <Ionicons name="lock-open-outline" size={13} color={colors.primaryFg} />
          <Text style={styles.unlockedBadgeText}>UNLOCKED</Text>
        </View>
        <Pressable style={styles.headerBtn}>
          <Ionicons name="download-outline" size={22} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Sender info */}
        <View style={styles.senderRow}>
          <View style={styles.senderAvatar}>
            <Text style={styles.senderAvatarText}>{capsule.fromInitial}</Text>
          </View>
          <View>
            <Text style={styles.senderName}>From {capsule.from}</Text>
            <Text style={styles.sealedOn}>
              Sealed on {formatDate(capsule.sealedAt)}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.capsuleTitle}>{capsule.title}</Text>

        {/* Dynamic content — only render what's actually there */}
        {loadingContents ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 32 }} />
        ) : contents.length === 0 ? (
          <View style={styles.emptyContent}>
            <Ionicons name="time-outline" size={32} color={colors.mutedFg} />
            <Text style={styles.emptyText}>No content in this capsule</Text>
          </View>
        ) : (
          contents.map((item) => (
            <ContentBlock key={item.id} item={item} />
          ))
        )}

        {/* Save to Heart */}
        <Pressable
          onPress={handleToggleFavorite}
          disabled={toggling}
          style={styles.heartButton}
        >
          <LinearGradient
            colors={[`${colors.primary}30`, `${colors.secondary}20`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.heartGradient}
          >
            {toggling ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons
                name={favorited ? "heart" : "heart-outline"}
                size={20}
                color={colors.primary}
              />
            )}
            <Text style={styles.heartText}>
              {favorited ? "Saved to Heart" : "Save to Heart"}
            </Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  unlockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  unlockedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primaryFg,
    letterSpacing: 1.5,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  senderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
    marginTop: 8,
  },
  senderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondaryBackground,
    borderWidth: 1.5,
    borderColor: `${colors.primary}40`,
    alignItems: "center",
    justifyContent: "center",
  },
  senderAvatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.foreground,
  },
  senderName: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.foreground,
  },
  sealedOn: {
    fontSize: 12,
    color: colors.mutedFg,
    marginTop: 2,
  },
  capsuleTitle: {
    fontSize: 26,
    fontWeight: "300",
    color: colors.foreground,
    marginBottom: 20,
    lineHeight: 34,
    fontFamily: fonts.serif,
  },
  emptyContent: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedFg,
  },
  heartButton: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    marginTop: 4,
  },
  heartGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  heartText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
  },
});
