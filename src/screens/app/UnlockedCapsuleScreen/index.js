import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Modal,
  StatusBar,
  Share,
  Alert,
  Animated,
  Easing,
  useWindowDimensions,
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
import { getCapsule, toggleFavorite, updateVisibility } from "@/services/capsules";
import { hapticLight, hapticSuccess } from "@/utils/haptics";
import { normalizeCapsule } from "@/utils/normalize";
import { useAuth } from "@/hooks/useAuth";
import { getCachedCapsule, setCachedCapsule } from "@/utils/capsuleCache";
import { RecipientsSection } from "@/components/capsule/RecipientsSection";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as VideoThumbnails from "expo-video-thumbnails";
import ShareOverlay from "@/components/ShareOverlay";
import RecordingWaveform from "@/components/RecordingWaveform";

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
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  videoPlayBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
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

      {/* Animated waveform */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 8, justifyContent: "center", alignItems: "center" }}>
          <RecordingWaveform isActive={playing} />
        </View>

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
      <Pressable
        onPress={() => { setFullscreen(true); fullscreenPlayer.play(); }}
        style={contentStyles.videoContainer}
      >
        <VideoView
          player={player}
          style={contentStyles.video}
          contentFit="cover"
          nativeControls={false}
        />
        <View style={contentStyles.videoPlayOverlay} pointerEvents="none">
          <View style={contentStyles.videoPlayBadge}>
            <Ionicons name="play" size={26} color="#fff" style={{ marginLeft: 3 }} />
          </View>
        </View>
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

// ─── Photo carousel (multiple images) ────────────────────────────────────────

function CarouselSlide({ url, width, colors }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <View style={{ width, height: 260, backgroundColor: colors.secondaryBackground }}>
      {loading && !error && (
        <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.primary} />
      )}
      {error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Ionicons name="image-outline" size={32} color={colors.mutedFg} />
          <Text style={{ fontSize: 13, color: colors.mutedFg }}>Could not load image</Text>
        </View>
      ) : (
        <Pressable style={{ flex: 1 }} onPress={() => !loading && setFullscreen(true)}>
          <Image
            source={{ uri: url }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setError(true); }}
          />
          {!loading && (
            <>
              <View style={{ position: "absolute", bottom: 10, right: 10, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 8, padding: 6 }}>
                <Ionicons name="expand-outline" size={16} color="rgba(255,255,255,0.8)" />
              </View>
              <Pressable
                onPress={(e) => { e.stopPropagation(); downloadMedia(url); }}
                style={{ position: "absolute", bottom: 10, left: 10, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 8, padding: 6 }}
                hitSlop={8}
              >
                <Ionicons name="download-outline" size={16} color="rgba(255,255,255,0.85)" />
              </Pressable>
            </>
          )}
        </Pressable>
      )}
      <FullscreenImageModal uri={fullscreen ? url : null} onClose={() => setFullscreen(false)} />
    </View>
  );
}

function PhotoCarousel({ items, activeIndex, onIndexChange, caption }) {
  const { colors: themeColors } = useTheme();
  const contentStyles = useMemo(() => makeContentStyles(themeColors), [themeColors]);

  // Measure the card's inner width so each slide is exactly that wide
  const [cardWidth, setCardWidth] = useState(0);

  const onScroll = (e) => {
    if (!cardWidth) return;
    const idx = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
    if (idx !== activeIndex) onIndexChange(idx);
  };

  return (
    <View
      style={contentStyles.mediaCard}
      onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}
    >
      {/* Slides — each exactly card width */}
      {cardWidth > 0 && (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          bounces={false}
          renderItem={({ item }) => (
            <CarouselSlide url={item.url} width={cardWidth} colors={themeColors} />
          )}
          getItemLayout={(_, index) => ({ length: cardWidth, offset: cardWidth * index, index })}
          style={{ width: cardWidth }}
        />
      )}

      {/* Dot indicators inside the card */}
      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingVertical: 10 }}>
        {items.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === activeIndex ? 18 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i === activeIndex ? themeColors.primary : themeColors.mutedFg,
            }}
          />
        ))}
      </View>

      {/* Caption inside the card, separated by divider */}
      {!!caption && (
        <>
          <View style={contentStyles.captionDivider} />
          <Text style={contentStyles.captionText}>{caption}</Text>
        </>
      )}
    </View>
  );
}

// ─── Audio block for share canvas — loads the audio to read its actual duration ─

function CanvasAudioBlock({ voiceItem, primary, cs }) {
  const player = useAudioPlayer({ uri: voiceItem.url });
  const status = useAudioPlayerStatus(player);
  const durationMs = status?.duration
    ? status.duration * 1000
    : (voiceItem.duration ?? 0) * 1000;

  return (
    <View style={cs.audioBlock}>
      <View style={cs.audioBlockHeader}>
        <View style={cs.audioMicWrap}>
          <Ionicons name="mic" size={14} color={primary} />
        </View>
        <Text style={cs.audioLabel}>Voice Note</Text>
        <Text style={cs.audioDuration}>{formatMs(durationMs)}</Text>
      </View>
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        <RecordingWaveform isActive={true} color={primary} />
      </View>
    </View>
  );
}

// ─── Video thumbnail for share canvas ─────────────────────────────────────────

function CanvasVideoThumb({ url, cs }) {
  const [thumbUri, setThumbUri] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(url, { time: 0, quality: 0.8 });
        if (!cancelled) setThumbUri(uri);
      } catch {
        // Leave thumbUri null — fallback placeholder will show
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  if (!thumbUri) {
    return (
      <View style={cs.videoPlaceholder}>
        <Ionicons name="videocam" size={40} color="rgba(255,255,255,0.35)" />
      </View>
    );
  }
  return <Image source={{ uri: thumbUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />;
}

// ─── Capsule share canvas — 9:16, card centred at 80% width ──────────────────

const CANVAS_BG = "#0D0C0A";
const CANVAS_TEXT = "#F5EFE6";
const CANVAS_DIM = "rgba(245,239,230,0.45)";

const makeCanvasStyles = (primary, cardW, mediaH) => StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: -9999,
    top: 0,
    overflow: "hidden",
    backgroundColor: CANVAS_BG,
  },
  bgTint: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.06,
    backgroundColor: primary,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 14,
  },
  ownerRow: {
    width: cardW,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(245,239,230,0.12)",
    borderWidth: 1.5,
    borderColor: `${primary}50`,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarInitial: { color: CANVAS_TEXT, fontSize: 15, fontWeight: "700" },
  ownerName: { color: CANVAS_TEXT, fontSize: 13, fontWeight: "600" },
  ownerVerb: { color: CANVAS_DIM, fontSize: 10, marginTop: 1 },
  card: {
    width: cardW,
    backgroundColor: "#181510",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(245,239,230,0.10)",
  },
  mediaArea: {
    width: cardW,
    height: mediaH,
    backgroundColor: "#1d1914",
    overflow: "hidden",
  },
  videoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  audioBlock: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 14,
  },
  audioBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  audioMicWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${primary}22`,
    borderWidth: 1,
    borderColor: `${primary}55`,
    alignItems: "center",
    justifyContent: "center",
  },
  audioLabel: {
    color: CANVAS_TEXT,
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  audioDuration: {
    color: CANVAS_DIM,
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
  mediaDivider: { height: 1, backgroundColor: "rgba(245,239,230,0.08)" },
  captionText: {
    color: CANVAS_DIM,
    fontSize: 10,
    fontStyle: "italic",
    lineHeight: 16,
    padding: 14,
    textAlign: "justify",
  },
  textOnlyWrap: { paddingHorizontal: 18, paddingVertical: 20 },
  textOnlyBody: {
    color: CANVAS_TEXT,
    paddingTop: 8,
    fontSize: 10,
    fontStyle: "italic",
    lineHeight: 16,
  },
  cardFooter: { padding: 14, gap: 8 },
  cardTitle: {
    color: CANVAS_TEXT,
    fontSize: 16,
    lineHeight: 22,
  },
  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245,239,230,0.08)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(245,239,230,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  locationText: { color: CANVAS_DIM, fontSize: 10, letterSpacing: 0.3 },
  // Brand — same as LoginScreen
  brandBlock: { alignItems: "center", gap: 2, marginTop: 4 },
  brandLogo: {
    fontSize: 14,
    color: `${primary}55`,
    fontFamily: "Moul",
    fontWeight: "300",
  },
  brandTagline: {
    color: `${CANVAS_DIM}`,
    fontSize: 8,
    letterSpacing: 1,
    fontFamily: "MrsSans",
  },
});

function CapsuleShareCanvas({ canvasRef, capsule, activePhotoUrl, contents, colors }) {
  const { width: screenW } = useWindowDimensions();

  const CW = screenW;
  const CH = Math.round(CW * (16 / 9));
  const cardW = Math.round(CW * 0.70);
  const mediaH = Math.round(cardW * 0.75);

  const cs = useMemo(
    () => makeCanvasStyles(colors.primary, cardW, mediaH),
    [colors.primary, cardW, mediaH]
  );

  const textItem = contents?.find(c => c.content_type === "text");
  const photoItem = activePhotoUrl ? { url: activePhotoUrl } : contents?.find(c => c.content_type === "photo");
  const voiceItem = contents?.find(c => c.content_type === "voice");
  const videoItem = contents?.find(c => c.content_type === "video");

  const hasPhoto = !!photoItem?.url;
  const hasVideo = !!videoItem?.url && !hasPhoto;
  const hasAudio = !!voiceItem?.url && !hasPhoto && !hasVideo;
  const hasText = !!textItem?.body;

  const verb = hasPhoto || hasVideo ? "Captured" : hasAudio ? "Recorded" : "Written";

  return (
    <View
      ref={canvasRef}
      collapsable={false}
      style={[cs.wrapper, { width: CW, height: CH }]}
    >
      <View style={cs.bgTint} />

      <View style={cs.center}>
        {/* Owner row — above the card */}
        <View style={cs.ownerRow}>
          <View style={cs.avatar}>
            {capsule.fromAvatar
              ? <Image source={{ uri: capsule.fromAvatar }} style={cs.avatarImg} resizeMode="cover" />
              : <Text style={cs.avatarInitial}>{capsule.fromInitial ?? "?"}</Text>
            }
          </View>
          <View style={{ flex: 1 }}>
            <Text style={cs.ownerName} numberOfLines={1}>{capsule.from}</Text>
            <Text style={cs.ownerVerb}>{`${verb} on ${formatDate(capsule.sealedAt)}`}</Text>
          </View>
        </View>

        {/* Card */}
        <View style={cs.card}>
          {/* Photo / video media area */}
          {(hasPhoto || hasVideo) && (
            <View style={cs.mediaArea}>
              {hasPhoto && (
                <Image source={{ uri: photoItem.url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              )}
              {hasVideo && (
                <CanvasVideoThumb url={videoItem.url} cs={cs} />
              )}
            </View>
          )}

          {/* Audio block — free-flowing, like text-only */}
          {hasAudio && (
            <CanvasAudioBlock voiceItem={voiceItem} primary={colors.primary} cs={cs} />
          )}

          {/* Caption alongside media */}
          {hasText && (hasPhoto || hasVideo || hasAudio) && (
            <>
              <View style={cs.mediaDivider} />
              <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
                <Text style={[cs.cardTitle, { fontFamily: fonts.serifBold }]} numberOfLines={2}>
                  {capsule.title}
                </Text>
              </View>
              <Text style={cs.captionText} numberOfLines={10}>{textItem.body}</Text>
            </>
          )}

          {/* Text-only capsule */}
          {!hasPhoto && !hasVideo && !hasAudio && hasText && (
            <View style={cs.textOnlyWrap}>
              <Text style={[cs.cardTitle, { fontFamily: fonts.serifBold }]} numberOfLines={2}>
                {capsule.title}
              </Text>
              <Text style={[cs.textOnlyBody, { fontFamily: fonts.serif }]} numberOfLines={16}>
                {textItem.body}
              </Text>
            </View>
          )}

          {/* Footer: title + location */}
          <View style={cs.cardFooter}>
            {!!capsule.locationName && (
              <View style={cs.locationPill}>
                <Ionicons name="location-outline" size={11} color={CANVAS_DIM} />
                <Text style={cs.locationText} numberOfLines={1} ellipsizeMode="tail">
                  {capsule.locationName}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Brand — same Moul font as LoginScreen */}
        <View style={cs.brandBlock}>
          <Text style={cs.brandLogo}>futrr</Text>
          <Text style={cs.brandTagline}>leave something worth waiting for.</Text>
        </View>
      </View>
    </View>
  );
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
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 3,
  },
  actionCount: {
    fontSize: 11,
    color: colors.mutedFg,
    fontWeight: "500",
  },
  actionDivider: {
    flex: 1,
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
  const [isPublic, setIsPublic] = useState(initialCapsule.isPublic ?? false);
  const [listedInAtlas, setListedInAtlas] = useState(initialCapsule.listedInAtlas ?? true);
  const [favoriteCount, setFavoriteCount] = useState(initialCapsule.favoriteCount ?? 0);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [mapRegion, setMapRegion] = useState(null);
  const [pinCoord, setPinCoord] = useState(null);
  const [savingAtlas, setSavingAtlas] = useState(false);

  const heartScale = useRef(new Animated.Value(1)).current;

  // Carousel + share
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [shareImageUri, setShareImageUri] = useState(null);
  const [showShareOverlay, setShowShareOverlay] = useState(false);
  const canvasRef = useRef(null);

  // ── Section fade-in animations (run once on mount) ──────────────────────────
  const aSender = useRef(new Animated.Value(0)).current;
  const aTitle = useRef(new Animated.Value(0)).current;
  const aBadges = useRef(new Animated.Value(0)).current;
  const aContent = useRef(new Animated.Value(0)).current;
  const aBottom = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 2s pause after screen renders, then each section drifts in slowly
    const t = setTimeout(() => {
      Animated.stagger(320, [aSender, aTitle, aBadges, aContent, aBottom].map(a =>
        Animated.timing(a, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true })
      )).start();
    }, 2000);
    return () => clearTimeout(t);
  }, []);
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
      setIsPublic(norm.isPublic);
      setListedInAtlas(norm.listedInAtlas);
      setFavoriteCount(norm.favoriteCount);
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
          setIsPublic(norm.isPublic);
          setListedInAtlas(norm.listedInAtlas);
          setFavoriteCount(norm.favoriteCount);
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

  const handleSharePress = async () => {
    try {
      const uri = await captureRef(canvasRef, { format: "png", quality: 0.95 });
      setShareImageUri(uri);
      setShowShareOverlay(true);
    } catch {
      Alert.alert("Error", "Could not prepare image for sharing.");
    }
  };

  const handleHeartPress = () => {
    // Shrink → spring back, then toggle favourite
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 0.65, duration: 90, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, tension: 200, friction: 5, useNativeDriver: true }),
    ]).start();
    handleToggleFavorite();
  };

  const handleToggleFavorite = async () => {
    hapticLight();
    const newFavorited = !favorited;
    setFavorited(newFavorited);
    setFavoriteCount((c) => c + (newFavorited ? 1 : -1));
    try {
      await toggleFavorite(capsule._id || capsule.id);
      if (newFavorited) hapticSuccess();
    } catch (_) {
      // rollback
      setFavorited(!newFavorited);
      setFavoriteCount((c) => c + (newFavorited ? -1 : 1));
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
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 1 — Sender info */}
        <Animated.View style={[styles.senderRow, { opacity: aSender }]}>
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
        </Animated.View>

        {/* 2 — Title */}
        <Animated.Text style={[styles.capsuleTitle, { opacity: aTitle }]}>{capsule.title}</Animated.Text>

        {/* 3 — Visibility & stats badges */}
        <Animated.View style={[styles.badgeRow, { opacity: aBadges }]}>
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
        </Animated.View>

        {/* 3b — Description (same group as badges) */}
        {!!capsule.description && (
          <Animated.Text style={[styles.capsuleDescription, { opacity: aBadges }]}>
            {capsule.description}
          </Animated.Text>
        )}

        {/* 4 — Media / content */}
        <Animated.View style={{ opacity: aContent }}>
          {loadingContents ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 32 }} />
          ) : contents.length === 0 ? (
            <View style={styles.emptyContent}>
              <Ionicons name="time-outline" size={32} color={colors.mutedFg} />
              <Text style={styles.emptyText}>No content in this capsule</Text>
            </View>
          ) : (() => {
            const textItem = contents.find(c => c.content_type === "text");
            const photoItems = contents.filter(c => c.content_type === "photo");
            const otherMedia = contents.filter(c => c.content_type !== "text" && c.content_type !== "photo");

            return (
              <>
                {/* Multiple photos → carousel with dots + caption below */}
                {photoItems.length > 1 && (
                  <PhotoCarousel
                    items={photoItems}
                    activeIndex={activePhotoIndex}
                    onIndexChange={setActivePhotoIndex}
                    caption={textItem?.body ?? null}
                  />
                )}
                {/* Single photo → normal ContentBlock */}
                {photoItems.length === 1 && (
                  <ContentBlock item={photoItems[0]} caption={otherMedia.length === 0 ? textItem?.body : null} />
                )}
                {/* Video, voice */}
                {otherMedia.map((item, idx) => (
                  <ContentBlock
                    key={item.id}
                    item={item}
                    caption={idx === 0 && photoItems.length === 0 ? textItem?.body : null}
                  />
                ))}
                {/* Text-only capsule */}
                {photoItems.length === 0 && otherMedia.length === 0 && textItem && (
                  <View style={styles.textCard}>
                    <Text style={styles.textCardBody}>{textItem.body}</Text>
                  </View>
                )}
              </>
            );
          })()}
        </Animated.View>

        {/* 5 — Action bar + recipients */}
        <Animated.View style={{ opacity: aBottom }}>
          <View style={styles.actionBar}>
            <Pressable onPress={handleHeartPress} style={styles.actionBtn} accessibilityLabel="Favourite">
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Ionicons name={favorited ? "heart" : "heart-outline"} size={26} color={favorited ? colors.primary : colors.foreground} />
              </Animated.View>
            </Pressable>

            <View style={styles.actionDivider} />

            {isOwner && (
              <Pressable onPress={handleEditVisibility} style={styles.actionBtn} accessibilityLabel="Edit visibility">
                <Ionicons name="eye-outline" size={24} color={colors.foreground} />
              </Pressable>
            )}

            <Pressable
              onPress={handleSharePress}
              style={styles.actionBtn}
              accessibilityLabel="Share"
            >
              <Ionicons name="share-outline" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          {!isPublic && (
            <RecipientsSection
              capsuleId={capsule._id || capsule.id}
              recipients={capsule.recipients ?? []}
              style={{ marginTop: 12 }}
            />
          )}
        </Animated.View>
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

      {/* Off-screen share canvas — always rendered so captureRef works */}
      <CapsuleShareCanvas
        canvasRef={canvasRef}
        capsule={capsule}
        activePhotoUrl={
          (() => {
            const photoItems = contents.filter(c => c.content_type === "photo");
            return photoItems[activePhotoIndex]?.url ?? null;
          })()
        }
        contents={contents}
        colors={colors}
      />

      {/* Share overlay */}
      <ShareOverlay
        visible={showShareOverlay}
        imageUri={shareImageUri}
        onClose={() => setShowShareOverlay(false)}
      />
    </SafeAreaView>
  );
}
