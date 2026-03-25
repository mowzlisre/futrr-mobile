import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  StatusBar,
  Share,
  Alert,
  Animated,
} from "react-native";
import { useState, useEffect, useRef, useMemo } from "react";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import MapView, { Marker } from "react-native-maps";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { VideoView, useVideoPlayer } from "expo-video";
import Slider from "@react-native-community/slider";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fonts } from "@/constants";
import { useTheme } from "@/hooks/useTheme";
import { formatDate } from "@/utils/date";
import { getCapsule, toggleFavorite, togglePin, updateVisibility } from "@/services/capsules";
import { normalizeCapsule } from "@/utils/normalize";
import { useAuth } from "@/hooks/useAuth";
import { getCachedCapsule, setCachedCapsule } from "@/utils/capsuleCache";
import { RecipientsSection } from "@/components/capsule/RecipientsSection";

// ─── Media download helper ────────────────────────────────────────────────────

async function downloadMedia(url) {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Allow access to save media to your library.");
      return;
    }
    const ext = url.split("?")[0].split(".").pop() || "jpg";
    const fileUri = FileSystem.cacheDirectory + `futrr_${Date.now()}.${ext}`;
    const { uri } = await FileSystem.downloadAsync(url, fileUri);
    await MediaLibrary.saveToLibraryAsync(uri);
    Alert.alert("Saved", "Media saved to your library.");
  } catch {
    Alert.alert("Error", "Could not save media.");
  }
}

// ─── Seek bar (native Slider) ─────────────────────────────────────────────────

const makeSeekStyles = (colors) => StyleSheet.create({
  slider: {
    width: "100%",
    height: 24,
    marginVertical: 2,
  },
});

function SeekBar({ positionMs, durationMs, onSeek }) {
  const { colors } = useTheme();
  const seekStyles = useMemo(() => makeSeekStyles(colors), [colors]);
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

function formatMs(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// ─── Content renderers ────────────────────────────────────────────────────────

const makeContentStyles = (colors) => StyleSheet.create({
  // Unified card wrapper for all media types
  mediaCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: "hidden",
  },

  // Photo
  photoContainer: {
    width: "100%",
    height: 260,
    backgroundColor: colors.secondaryBackground,
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
  fullscreenHint: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 8,
    padding: 6,
  },
  mediaDownloadBtn: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 8,
    padding: 6,
  },
  voiceDownloadBtn: {
    padding: 6,
  },

  // Caption (below media)
  captionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  captionText: {
    fontSize: 14,
    fontWeight: "300",
    color: colors.foreground,
    lineHeight: 22,
    fontStyle: "italic",
    fontFamily: fonts.serif,
    padding: 16,
  },

  // Voice
  voiceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    paddingBottom: 8,
  },
  voiceIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: `${colors.primary}18`,
    borderWidth: 1.5,
    borderColor: `${colors.primary}40`,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.foreground,
  },
  voiceDuration: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedFg,
    marginTop: 2,
  },
  waveform: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    height: 36,
    paddingHorizontal: 16,
  },
  waveBar: {
    flex: 1,
    borderRadius: 2,
  },
  waveBarFilled: {
    backgroundColor: colors.primary,
  },
  waveBarEmpty: {
    backgroundColor: `${colors.mutedFg}35`,
  },
  voiceControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    paddingTop: 10,
  },
  voicePlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceTime: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedFg,
    minWidth: 36,
    textAlign: "right",
  },

  // Video
  videoContainer: {
    width: "100%",
    height: 220,
    backgroundColor: "#000",
  },
  video: {
    width: "100%",
    height: "100%",
  },

  // Fullscreen
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreenImage: {
    width: "100%",
    height: "100%",
  },
  fullscreenVideo: {
    width: "100%",
    height: "100%",
  },
  fullscreenClose: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});

const WAVEFORM_BARS = [4, 8, 14, 10, 18, 22, 16, 24, 20, 26, 18, 22, 14, 20, 16, 12, 20, 24, 18, 10, 16, 22, 14, 8, 12, 18, 24, 20, 14, 10];

function WaveformBars({ progress, playing }) {
  const { colors } = useTheme();
  const contentStyles = useMemo(() => makeContentStyles(colors), [colors]);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (playing) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.15,
            duration: 350,
            useNativeDriver: false,
          }),
          Animated.timing(pulse, {
            toValue: 0.85,
            duration: 350,
            useNativeDriver: false,
          }),
        ])
      );
      anim.start();
      return () => {
        anim.stop();
        pulse.setValue(1);
      };
    } else {
      pulse.setValue(1);
    }
  }, [playing]);

  return (
    <View style={contentStyles.waveform}>
      {WAVEFORM_BARS.map((h, i) => {
        const filled = i / WAVEFORM_BARS.length < progress;
        if (filled && playing) {
          return (
            <Animated.View
              key={i}
              style={[
                contentStyles.waveBar,
                contentStyles.waveBarFilled,
                { height: pulse.interpolate({ inputRange: [0.85, 1.15], outputRange: [h * 0.85, h * 1.15] }) },
              ]}
            />
          );
        }
        return (
          <View
            key={i}
            style={[
              contentStyles.waveBar,
              { height: h },
              filled ? contentStyles.waveBarFilled : contentStyles.waveBarEmpty,
            ]}
          />
        );
      })}
    </View>
  );
}

function Caption({ text }) {
  const { colors } = useTheme();
  const contentStyles = useMemo(() => makeContentStyles(colors), [colors]);
  if (!text) return null;
  return (
    <>
      <View style={contentStyles.captionDivider} />
      <Text style={contentStyles.captionText}>{text}</Text>
    </>
  );
}

// Fullscreen image viewer modal
function FullscreenImageModal({ uri, onClose }) {
  const { colors } = useTheme();
  const contentStyles = useMemo(() => makeContentStyles(colors), [colors]);
  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <StatusBar hidden />
      <View style={contentStyles.fullscreenOverlay}>
        <Image source={{ uri }} style={contentStyles.fullscreenImage} resizeMode="contain" />
        <Pressable onPress={onClose} style={contentStyles.fullscreenClose}>
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
      </View>
    </Modal>
  );
}

function PhotoContent({ url, caption }) {
  const { colors } = useTheme();
  const contentStyles = useMemo(() => makeContentStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <View style={contentStyles.mediaCard}>
      <Pressable onPress={() => !error && setFullscreen(true)} style={contentStyles.photoContainer}>
        {loading && !error && (
          <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.primary} />
        )}
        {error ? (
          <View style={contentStyles.photoError}>
            <Ionicons name="image-outline" size={32} color={colors.mutedFg} />
            <Text style={contentStyles.photoErrorText}>Could not load image</Text>
          </View>
        ) : (
          <>
            <Image
              source={{ uri: url }}
              style={contentStyles.photo}
              resizeMode="cover"
              onLoad={() => setLoading(false)}
              onError={() => { setLoading(false); setError(true); }}
            />
            {!loading && (
              <>
                <View style={contentStyles.fullscreenHint}>
                  <Ionicons name="expand-outline" size={16} color="rgba(255,255,255,0.8)" />
                </View>
                <Pressable
                  onPress={() => downloadMedia(url)}
                  style={contentStyles.mediaDownloadBtn}
                  hitSlop={8}
                >
                  <Ionicons name="download-outline" size={16} color="rgba(255,255,255,0.85)" />
                </Pressable>
              </>
            )}
          </>
        )}
      </Pressable>
      <Caption text={caption} />
      <FullscreenImageModal uri={fullscreen ? url : null} onClose={() => setFullscreen(false)} />
    </View>
  );
}

function VoiceContent({ url, duration, caption }) {
  const { colors } = useTheme();
  const contentStyles = useMemo(() => makeContentStyles(colors), [colors]);
  const player = useAudioPlayer({ uri: url });
  const status = useAudioPlayerStatus(player);

  const positionMs = (status.currentTime ?? 0) * 1000;
  const durationMs = status.duration ? status.duration * 1000 : (duration ? duration * 1000 : 0);
  const playing = status.playing ?? false;
  const progress = durationMs > 0 ? positionMs / durationMs : 0;

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
    <View style={contentStyles.mediaCard}>
      {/* Header */}
      <View style={contentStyles.voiceHeader}>
        <View style={contentStyles.voiceIconWrap}>
          <Ionicons name="mic-outline" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={contentStyles.voiceTitle}>Voice Note</Text>
          <Text style={contentStyles.voiceDuration}>{formatMs(durationMs)}</Text>
        </View>
        <Pressable onPress={() => downloadMedia(url)} hitSlop={8} style={contentStyles.voiceDownloadBtn}>
          <Ionicons name="download-outline" size={18} color={colors.mutedFg} />
        </Pressable>
      </View>

      {/* Waveform */}
      <WaveformBars progress={progress} playing={playing} />

      {/* Controls: play/pause + seek + time */}
      <View style={contentStyles.voiceControls}>
        <Pressable onPress={toggle} style={contentStyles.voicePlayBtn}>
          <Ionicons name={playing ? "pause" : "play"} size={18} color={colors.primaryFg} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <SeekBar positionMs={positionMs} durationMs={durationMs} onSeek={seek} />
        </View>
        <Text style={contentStyles.voiceTime}>{formatMs(positionMs)}</Text>
      </View>

      <Caption text={caption} />
    </View>
  );
}

function VideoContent({ url, caption }) {
  const { colors } = useTheme();
  const contentStyles = useMemo(() => makeContentStyles(colors), [colors]);
  const [fullscreen, setFullscreen] = useState(false);
  const player = useVideoPlayer({ uri: url });
  const fullscreenPlayer = useVideoPlayer({ uri: url });

  return (
    <View style={contentStyles.mediaCard}>
      <Pressable onPress={() => setFullscreen(true)} style={contentStyles.videoContainer}>
        <VideoView
          player={player}
          style={contentStyles.video}
          contentFit="contain"
          nativeControls={true}
        />
        <View style={contentStyles.fullscreenHint}>
          <Ionicons name="expand-outline" size={16} color="rgba(255,255,255,0.8)" />
        </View>
        <Pressable
          onPress={() => downloadMedia(url)}
          style={contentStyles.mediaDownloadBtn}
          hitSlop={8}
        >
          <Ionicons name="download-outline" size={16} color="rgba(255,255,255,0.85)" />
        </Pressable>
      </Pressable>

      <Caption text={caption} />

      {/* Fullscreen video modal */}
      <Modal visible={fullscreen} transparent animationType="fade" onRequestClose={() => setFullscreen(false)}>
        <StatusBar hidden />
        <View style={contentStyles.fullscreenOverlay}>
          <VideoView
            player={fullscreenPlayer}
            style={contentStyles.fullscreenVideo}
            contentFit="contain"
            nativeControls={true}
          />
          <Pressable onPress={() => setFullscreen(false)} style={contentStyles.fullscreenClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

function ContentBlock({ item, caption }) {
  if (item.content_type === "text") return null; // text handled as caption
  if (item.content_type === "photo") return <PhotoContent url={item.url} caption={caption} />;
  if (item.content_type === "voice") return <VoiceContent url={item.url} duration={item.duration} caption={caption} />;
  if (item.content_type === "video") return <VideoContent url={item.url} caption={caption} />;
  return null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${colors.primary}55`,
  },
  unlockedBadgeText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
    color: colors.primary,
    letterSpacing: 0.5,
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
    lineHeight: 17,
    color: colors.mutedFg,
    marginTop: 2,
  },
  capsuleTitle: {
    fontSize: 26,
    fontWeight: "300",
    color: colors.foreground,
    marginBottom: 8,
    lineHeight: 34,
    fontFamily: fonts.serif,
  },
  capsuleDescription: {
    fontSize: 14,
    color: colors.mutedFg,
    lineHeight: 21,
    marginBottom: 20,
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
  textCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  textCardBody: {
    fontSize: 15,
    fontWeight: "300",
    color: colors.foreground,
    lineHeight: 26,
    fontStyle: "italic",
    fontFamily: fonts.serif,
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
  headerRight: {
    flexDirection: "row",
    gap: 8,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgePublic: {
    backgroundColor: `${colors.success}15`,
    borderColor: `${colors.success}40`,
  },
  badgePrivate: {
    backgroundColor: `${colors.mutedFg}15`,
    borderColor: `${colors.mutedFg}40`,
  },
  badgeAtlas: {
    backgroundColor: `${colors.primary}15`,
    borderColor: `${colors.primary}40`,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
    color: colors.mutedFg,
  },
  badgeTextPublic: {
    color: colors.success,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statChipText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
    color: colors.mutedFg,
  },
  pinButton: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  pinInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: colors.card,
  },
  pinText: {
    fontSize: 14,
    color: colors.mutedFg,
    fontWeight: "600",
  },
  // ── Map picker modal ──
  mapModal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
  },
  mapHeaderTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.foreground,
  },
  mapHint: {
    fontSize: 13,
    color: colors.mutedFg,
    textAlign: "center",
    paddingBottom: 12,
  },
  mapContainer: {
    flex: 1,
  },
  mapView: {
    flex: 1,
  },
  fixedPinWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  fixedPinShadow: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.25)",
    marginTop: -4,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function UnlockedCapsuleScreen() {
  const { colors, isDark, mapStyle } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { capsule: initialCapsule } = route.params;

  const [capsule, setCapsule] = useState(initialCapsule);
  const [loadingContents, setLoadingContents] = useState(
    !initialCapsule.contents?.length
  );
  const [favorited, setFavorited] = useState(initialCapsule.isFavorited ?? false);
  const [pinned, setPinned] = useState(initialCapsule.isPinned ?? false);
  const [isPublic, setIsPublic] = useState(initialCapsule.isPublic ?? false);
  const [listedInAtlas, setListedInAtlas] = useState(initialCapsule.listedInAtlas ?? true);
  const [favoriteCount, setFavoriteCount] = useState(initialCapsule.favoriteCount ?? 0);
  const [pinCount, setPinCount] = useState(initialCapsule.pinCount ?? 0);
  const [toggling, setToggling] = useState(false);
  const [togglingPin, setTogglingPin] = useState(false);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [mapRegion, setMapRegion] = useState(null);
  const [pinCoord, setPinCoord] = useState(null);
  const [savingAtlas, setSavingAtlas] = useState(false);
  const isOwner = user?.id && capsule.createdBy === user.id;

  // If the capsule came from the vault list it won't have contents (list
  // endpoint omits them). Check cache first, then fetch if needed.
  useEffect(() => {
    if (initialCapsule.contents?.length) return; // already have contents
    const capsuleId = initialCapsule._id || initialCapsule.id;
    const cached = getCachedCapsule(capsuleId);
    if (cached) {
      const norm = normalizeCapsule(cached, user?.id);
      setCapsule(norm);
      setFavorited(cached.is_favorited ?? false);
      setPinned(cached.is_pinned ?? false);
      setIsPublic(norm.isPublic);
      setListedInAtlas(norm.listedInAtlas);
      setFavoriteCount(norm.favoriteCount);
      setPinCount(norm.pinCount);
      setLoadingContents(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const raw = await getCapsule(capsuleId);
        setCachedCapsule(capsuleId, raw);
        if (!cancelled) {
          const norm = normalizeCapsule(raw, user?.id);
          setCapsule(norm);
          setFavorited(raw.is_favorited ?? false);
          setPinned(raw.is_pinned ?? false);
          setIsPublic(norm.isPublic);
          setListedInAtlas(norm.listedInAtlas);
          setFavoriteCount(norm.favoriteCount);
          setPinCount(norm.pinCount);
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
      setFavoriteCount((c) => c + (res.favorited ? 1 : -1));
    } catch (_) {
      // keep current state
    } finally {
      setToggling(false);
    }
  };

  const handleTogglePin = async () => {
    if (togglingPin) return;
    try {
      setTogglingPin(true);
      const res = await togglePin(capsule._id || capsule.id);
      setPinned(res.pinned);
      setPinCount((c) => c + (res.pinned ? 1 : -1));
    } catch (_) {
      // keep current state
    } finally {
      setTogglingPin(false);
    }
  };

  const openAtlasPicker = async () => {
    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== "granted") {
        Alert.alert("Location required", "Allow location access to pin on Atlas.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coord = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setPinCoord(coord);
      setMapRegion({ ...coord, latitudeDelta: 0.01, longitudeDelta: 0.01 });
      setMapPickerVisible(true);
    } catch {
      Alert.alert("Error", "Could not get your location.");
    }
  };

  const handleConfirmAtlasPin = async () => {
    if (!pinCoord || savingAtlas) return;
    setSavingAtlas(true);
    try {
      const [place] = await Location.reverseGeocodeAsync(pinCoord).catch(() => [null]);
      const locationName = place
        ? [place.name, place.city, place.region].filter(Boolean).join(", ")
        : "";
      const res = await updateVisibility(capsule._id || capsule.id, {
        listed_in_atlas: true,
        latitude: pinCoord.latitude,
        longitude: pinCoord.longitude,
        location_name: locationName,
      });
      setIsPublic(res.is_public);
      setListedInAtlas(res.listed_in_atlas);
      setMapPickerVisible(false);
    } catch {
      Alert.alert("Error", "Could not update Atlas listing.");
    } finally {
      setSavingAtlas(false);
    }
  };

  const handleEditVisibility = () => {
    const buttons = [];

    if (isPublic) {
      buttons.push({
        text: "Make Private",
        style: "destructive",
        onPress: async () => {
          const res = await updateVisibility(capsule._id || capsule.id, { is_public: false });
          setIsPublic(res.is_public);
          setListedInAtlas(res.listed_in_atlas);
          if (!res.is_public) { setPinned(false); setPinCount(0); }
        },
      });

      if (listedInAtlas) {
        buttons.push({
          text: "Remove from Atlas",
          onPress: async () => {
            const res = await updateVisibility(capsule._id || capsule.id, { listed_in_atlas: false });
            setListedInAtlas(res.listed_in_atlas);
          },
        });
      } else {
        buttons.push({
          text: "Show in Atlas",
          onPress: openAtlasPicker,
        });
      }
    } else {
      // Private capsule options
      buttons.push({
        text: "Make Public",
        onPress: async () => {
          const res = await updateVisibility(capsule._id || capsule.id, { is_public: true });
          setIsPublic(res.is_public);
          setListedInAtlas(res.listed_in_atlas);
        },
      });
      buttons.push({
        text: "Show in Atlas",
        onPress: openAtlasPicker,
      });
    }

    buttons.push({ text: "Cancel", style: "cancel" });

    Alert.alert("Capsule Visibility", "Choose an option", buttons);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <View style={styles.unlockedBadge}>
          <Ionicons name="lock-open-outline" size={13} color={colors.primary} />
          <Text style={styles.unlockedBadgeText}>Unlocked</Text>
        </View>
        <View style={styles.headerRight}>
          {isOwner && (
            <Pressable onPress={handleEditVisibility} style={styles.headerBtn}>
              <Ionicons name="create-outline" size={20} color={colors.foreground} />
            </Pressable>
          )}
          <Pressable
            onPress={() => Share.share({ message: capsule.title, title: capsule.title })}
            style={styles.headerBtn}
          >
            <Ionicons name="share-outline" size={22} color={colors.foreground} />
          </Pressable>
        </View>
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

        {/* Visibility & stats badges */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, isPublic ? styles.badgePublic : styles.badgePrivate]}>
            <Ionicons
              name={isPublic ? "globe-outline" : "lock-closed-outline"}
              size={12}
              color={isPublic ? colors.success : colors.mutedFg}
            />
            <Text style={[styles.badgeText, isPublic ? styles.badgeTextPublic : null]}>
              {isPublic ? "Public" : "Private"}
            </Text>
          </View>
          {isPublic && listedInAtlas && (
            <View style={[styles.badge, styles.badgeAtlas]}>
              <Ionicons name="map-outline" size={12} color={colors.primary} />
              <Text style={[styles.badgeText, { color: colors.primary }]}>Atlas</Text>
            </View>
          )}
          <View style={styles.statChip}>
            <Ionicons name="heart" size={12} color={colors.primary} />
            <Text style={styles.statChipText}>{favoriteCount}</Text>
          </View>
          <View style={styles.statChip}>
            <Ionicons name="pin" size={12} color={colors.primary} />
            <Text style={styles.statChipText}>{pinCount}</Text>
          </View>
        </View>

        {/* Description */}
        {!!capsule.description && (
          <Text style={styles.capsuleDescription}>{capsule.description}</Text>
        )}

        {/* Dynamic content — media items with text as caption below, or text-only */}
        {loadingContents ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 32 }} />
        ) : contents.length === 0 ? (
          <View style={styles.emptyContent}>
            <Ionicons name="time-outline" size={32} color={colors.mutedFg} />
            <Text style={styles.emptyText}>No content in this capsule</Text>
          </View>
        ) : (() => {
          const textItem = contents.find(c => c.content_type === "text");
          const mediaItems = contents.filter(c => c.content_type !== "text");
          if (mediaItems.length > 0) {
            return mediaItems.map((item, idx) => (
              <ContentBlock
                key={item.id}
                item={item}
                caption={idx === 0 ? textItem?.body : null}
              />
            ));
          }
          // Text-only capsule
          if (textItem) {
            return (
              <View style={styles.textCard}>
                <Text style={styles.textCardBody}>{textItem.body}</Text>
              </View>
            );
          }
          return null;
        })()}

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

        {/* Pin to Profile */}
        <Pressable
          onPress={handleTogglePin}
          disabled={togglingPin}
          style={styles.pinButton}
        >
          <View style={styles.pinInner}>
            {togglingPin ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons
                name={pinned ? "pin" : "pin-outline"}
                size={20}
                color={pinned ? colors.primary : colors.mutedFg}
              />
            )}
            <Text style={[styles.pinText, pinned && { color: colors.primary }]}>
              {pinned ? "Pinned to Profile" : "Pin to Profile"}
            </Text>
          </View>
        </Pressable>

        {/* Recipients */}
        <RecipientsSection
          capsuleId={capsule._id || capsule.id}
          recipients={capsule.recipients ?? []}
          style={{ marginTop: 12 }}
        />
      </ScrollView>

      {/* ── Atlas location picker modal ── */}
      <Modal
        visible={mapPickerVisible}
        animationType="slide"
        onRequestClose={() => setMapPickerVisible(false)}
      >
        <View style={styles.mapModal}>
          <View style={styles.mapHeader}>
            <Pressable onPress={() => setMapPickerVisible(false)} style={styles.headerBtn}>
              <Ionicons name="close" size={22} color={colors.foreground} />
            </Pressable>
            <Text style={styles.mapHeaderTitle}>Pin on Atlas</Text>
            <Pressable
              onPress={handleConfirmAtlasPin}
              disabled={savingAtlas}
              style={[styles.headerBtn, { backgroundColor: colors.primary }]}
            >
              {savingAtlas ? (
                <ActivityIndicator size="small" color={colors.primaryFg} />
              ) : (
                <Ionicons name="checkmark" size={22} color={colors.primaryFg} />
              )}
            </Pressable>
          </View>
          <Text style={styles.mapHint}>Drag the map to position the pin</Text>
          {mapRegion && (
            <View style={styles.mapContainer}>
              <MapView
                style={styles.mapView}
                initialRegion={mapRegion}
                onRegionChangeComplete={(region) => {
                  setPinCoord({ latitude: region.latitude, longitude: region.longitude });
                }}
                customMapStyle={mapStyle}
                userInterfaceStyle={isDark ? "dark" : "light"}
                showsUserLocation
                showsMyLocationButton
              />
              {/* Fixed pin in center of map */}
              <View style={styles.fixedPinWrapper} pointerEvents="none">
                <Ionicons name="location" size={40} color={colors.primary} />
                <View style={styles.fixedPinShadow} />
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
