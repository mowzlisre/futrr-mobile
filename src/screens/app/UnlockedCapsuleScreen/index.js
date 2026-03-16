import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEvent } from "expo";
import Slider from "@react-native-community/slider";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts } from "@/constants";
import { formatDate } from "@/utils/date";
import { getCapsule, toggleFavorite } from "@/services/capsules";
import { normalizeCapsule } from "@/utils/normalize";
import { useAuth } from "@/hooks/useAuth";
import { getCachedCapsule, setCachedCapsule } from "@/utils/capsuleCache";

// ─── Seek bar (native Slider) ─────────────────────────────────────────────────

function SeekBar({ positionMs, durationMs, onSeek }) {
  const [dragging, setDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);
  const normalized = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;

  return (
    <Slider
      style={seekStyles.slider}
      value={dragging ? dragValue : normalized}
      minimumValue={0}
      maximumValue={1}
      onSlidingStart={(v) => { setDragging(true); setDragValue(v); }}
      onValueChange={(v) => setDragValue(v)}
      onSlidingComplete={(v) => { setDragging(false); onSeek(v * durationMs); }}
      minimumTrackTintColor={colors.primary}
      maximumTrackTintColor={`${colors.primary}28`}
      thumbTintColor={colors.primary}
      tapToSeek
    />
  );
}

const seekStyles = StyleSheet.create({
  slider: {
    width: "100%",
    height: 24,
    marginVertical: 2,
  },
});

function formatMs(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

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
  // expo-audio: times are in seconds; convert to ms for display/seek interface
  const player = useAudioPlayer({ uri: url });
  const status = useAudioPlayerStatus(player);

  const positionMs = (status.currentTime ?? 0) * 1000;
  const durationMs = status.duration ? status.duration * 1000 : (duration ? duration * 1000 : 0);
  const playing = status.playing ?? false;

  const toggle = () => {
    if (playing) {
      player.pause();
    } else {
      if (status.didJustFinish) player.seekTo(0);
      player.play();
    }
  };

  const seek = (ms) => player.seekTo(ms / 1000);

  return (
    <View style={contentStyles.voiceCard}>
      <Pressable onPress={toggle} style={contentStyles.voiceIconWrap}>
        <Ionicons name={playing ? "pause" : "play"} size={22} color={colors.primary} />
      </Pressable>
      <View style={contentStyles.voiceInfo}>
        <View style={contentStyles.voiceTimeRow}>
          <Text style={contentStyles.voiceLabel}>Voice Note</Text>
          <Text style={contentStyles.voiceDuration}>
            {formatMs(positionMs)} / {formatMs(durationMs)}
          </Text>
        </View>
        <SeekBar positionMs={positionMs} durationMs={durationMs} onSeek={seek} />
      </View>
      <Ionicons name="mic-outline" size={18} color={colors.mutedFg} />
    </View>
  );
}

function VideoContent({ url }) {
  // expo-video: times are in seconds; set timeUpdateEventInterval for smooth tracking
  const player = useVideoPlayer({ uri: url }, (p) => {
    p.timeUpdateEventInterval = 0.25;
  });

  const { currentTime } = useEvent(player, "timeUpdate", { currentTime: 0 });
  const { isPlaying } = useEvent(player, "playingChange", { isPlaying: false });

  const positionMs = currentTime * 1000;
  const durationMs = (isNaN(player.duration) ? 0 : player.duration) * 1000;

  const toggle = () => {
    if (isPlaying) {
      player.pause();
    } else {
      if (positionMs >= durationMs && durationMs > 0) player.currentTime = 0;
      player.play();
    }
  };

  const seek = (ms) => { player.currentTime = ms / 1000; };

  return (
    <View style={contentStyles.videoContainer}>
      <VideoView
        player={player}
        style={contentStyles.video}
        contentFit="contain"
        nativeControls={false}
      />
      <View style={contentStyles.videoControls}>
        <Pressable onPress={toggle} style={contentStyles.voiceIconWrap}>
          <Ionicons name={isPlaying ? "pause" : "play"} size={22} color={colors.primary} />
        </Pressable>
        <View style={contentStyles.voiceInfo}>
          <View style={contentStyles.voiceTimeRow}>
            <Text style={contentStyles.voiceLabel}>Video</Text>
            <Text style={contentStyles.voiceDuration}>
              {formatMs(positionMs)} / {formatMs(durationMs)}
            </Text>
          </View>
          <SeekBar positionMs={positionMs} durationMs={durationMs} onSeek={seek} />
        </View>
        <Ionicons name="videocam-outline" size={18} color={colors.mutedFg} />
      </View>
    </View>
  );
}

function ContentBlock({ item }) {
  if (item.content_type === "text") return <TextContent body={item.body} />;
  if (item.content_type === "photo") return <PhotoContent url={item.url} />;
  if (item.content_type === "voice")
    return <VoiceContent url={item.url} duration={item.duration} />;
  if (item.content_type === "video") return <VideoContent url={item.url} />;
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
  voiceTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  voiceLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.foreground,
  },
  voiceDuration: {
    fontSize: 12,
    color: colors.mutedFg,
  },
  videoContainer: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  video: {
    width: "100%",
    height: 220,
    backgroundColor: "#000",
  },
  videoControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
            {capsule.fromAvatar ? (
              <Image
                source={{ uri: capsule.fromAvatar }}
                style={styles.senderAvatarImg}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.senderAvatarText}>{capsule.fromInitial}</Text>
            )}
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
  senderAvatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
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
