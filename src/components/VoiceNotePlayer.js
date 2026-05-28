import {
  View,
  Text,
  Pressable,
  StyleSheet,
  PanResponder,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
} from "expo-audio";
import { useTheme } from "@/hooks/useTheme";

// ─── Layout constants ─────────────────────────────────────────────────────────

const MAX_BAR_HEIGHT = 36;
const BAR_WIDTH      = 4;
const BAR_MARGIN     = 1.6;
const BAR_SLOT       = BAR_WIDTH + BAR_MARGIN * 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSecs(secs) {
  const s = Math.max(0, Math.floor(secs ?? 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function buildFallbackWaveform(seed, count) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h ^ seed.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return Array.from({ length: count }, (_, i) => {
    h = (h ^ (i + 1)) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
    return 0.15 + ((h >>> 0) / 0xffffffff) * 0.85;
  });
}

function resample(source, count) {
  if (count <= 0) return [];
  if (count === source.length) return source;
  return Array.from({ length: count }, (_, i) => {
    const t  = (i / (count - 1)) * (source.length - 1);
    const lo = Math.floor(t);
    const hi = Math.min(lo + 1, source.length - 1);
    return source[lo] * (1 - (t - lo)) + source[hi] * (t - lo);
  });
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function VoiceNotePlayer({ uri, duration, waveformData, noPadding = false, allColored = false, showPlayButton = true }) {
  const { colors, isDark } = useTheme();

  const player = useAudioPlayer(
    uri ? { uri } : null,
    { updateInterval: 500 },
  );
  const status = useAudioPlayerStatus(player);

  const playing    = status.playing ?? false;
  const durationMs = status.duration
    ? status.duration * 1000
    : (duration ? duration * 1000 : 0);
  const durationSecs = durationMs / 1000;

  // ── Animation state ───────────────────────────────────────────────────────
  const animatedWidth    = useRef(new Animated.Value(0)).current;
  const animRef          = useRef(null);
  const containerWidthRef = useRef(0);
  const posRatioRef      = useRef(0);   // 0-1, updated by addListener
  const finishedRef      = useRef(false);

  // Track position ratio from animation so we can resume from the right spot
  useEffect(() => {
    const id = animatedWidth.addListener(({ value }) => {
      const w = containerWidthRef.current;
      if (w > 0) posRatioRef.current = value / w;
    });
    return () => animatedWidth.removeListener(id);
  }, []);

  // Starts / resumes animation from a given 0-1 ratio to end over the correct duration
  const startAnimationFrom = useCallback((ratio) => {
    const w = containerWidthRef.current;
    if (w <= 0 || durationMs <= 0) return;
    const remainingMs = (1 - ratio) * Math.max(0, durationMs - 1000);
    if (remainingMs <= 0) return;
    animRef.current?.stop();
    animatedWidth.setValue(ratio * w);
    animRef.current = Animated.timing(animatedWidth, {
      toValue: w,
      duration: remainingMs,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animRef.current.start(({ finished }) => {
      if (finished) {
        finishedRef.current = true;
        posRatioRef.current = 1;
      }
    });
  }, [animatedWidth, durationMs]);

  // If durationMs loads after play was already pressed, kick off the animation
  const prevDurationRef = useRef(0);
  useEffect(() => {
    if (durationMs > 0 && prevDurationRef.current === 0 && playing) {
      startAnimationFrom(posRatioRef.current);
    }
    prevDurationRef.current = durationMs;
  }, [durationMs]);

  // Android audio focus — once
  useEffect(() => {
    if (Platform.OS !== "android") return;
    setAudioModeAsync({
      shouldDuckAndroid: true,
      interruptionMode: "duckOthers",
      staysActiveInBackground: false,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});
  }, []);

  // ── Controls ──────────────────────────────────────────────────────────────

  const toggle = useCallback(() => {
    if (playing) {
      animRef.current?.stop();
      player.pause();
    } else {
      if (finishedRef.current) {
        finishedRef.current = false;
        posRatioRef.current = 0;
        animatedWidth.setValue(0);
        player.seekTo(0);
      }
      player.play();
      startAnimationFrom(posRatioRef.current);
    }
  }, [player, playing, animatedWidth, startAnimationFrom]);

  // Tap or drag on waveform → seek to that position and start playing
  const scrubAndPlay = useCallback((locationX) => {
    const w = containerWidthRef.current;
    if (w <= 0 || durationMs <= 0) return;
    const ratio = Math.max(0, Math.min(1, locationX / w));
    finishedRef.current = false;
    posRatioRef.current = ratio;
    animRef.current?.stop();
    animatedWidth.setValue(ratio * w);
    player.seekTo(ratio * durationSecs);
    player.play();
    startAnimationFrom(ratio);
  }, [player, animatedWidth, durationMs, durationSecs, startAnimationFrom]);

  // Stop animation cleanly when finished
  useEffect(() => {
    if (!status.didJustFinish) return;
    finishedRef.current = true;
    animRef.current?.stop();
    animatedWidth.setValue(containerWidthRef.current);
    posRatioRef.current = 1;
  }, [status.didJustFinish]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderGrant: (e) => scrubAndPlay(e.nativeEvent.locationX),
    onPanResponderMove:  (e) => scrubAndPlay(e.nativeEvent.locationX),
    onPanResponderRelease:   () => {},
    onPanResponderTerminate: () => {},
  }), [scrubAndPlay]);

  // ── Bar geometry ──────────────────────────────────────────────────────────

  const [containerWidth, setContainerWidth] = useState(0);

  const barCount = useMemo(
    () => containerWidth > 0 ? Math.max(8, Math.floor(containerWidth / BAR_SLOT)) : 0,
    [containerWidth],
  );

  const bars = useMemo(() => {
    if (barCount === 0) return [];
    const source = Array.isArray(waveformData) && waveformData.length > 0
      ? waveformData
      : buildFallbackWaveform(uri ?? "default", 64);
    return resample(source, barCount);
  }, [waveformData, uri, barCount]);

  const unplayedColor = isDark ? `${colors.primary}30` : `${colors.primary}20`;

  // Precompute heights once — both layers share the same values
  const barHeights = useMemo(
    () => bars.map((amp) => Math.max(3, amp * MAX_BAR_HEIGHT)),
    [bars],
  );

  return (
    <View style={[styles.player, noPadding && { padding: 0 }]}>
      {/* Play / Pause */}
      {showPlayButton && (
        <Pressable
          onPress={toggle}
          style={[styles.playBtn, { backgroundColor: colors.primary }]}
          accessibilityLabel={playing ? "Pause" : "Play"}
          accessibilityRole="button"
        >
          <Ionicons
            name={playing ? "pause" : "play"}
            size={14}
            color={colors.primaryFg}
            style={playing ? undefined : { marginLeft: 2 }}
          />
        </Pressable>
      )}

      {/* Waveform + time */}
      <View style={styles.right}>
        {/* Two-layer waveform — CSS clip trick:
              bottom layer = all bars in unplayed color (static)
              top layer    = all bars in played color, clipped to animatedWidth
              The Animated.timing on animatedWidth IS the only work happening during playback */}
        <View
          style={styles.waveformRow}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            containerWidthRef.current = w;
            setContainerWidth(w);
            if (allColored) animatedWidth.setValue(w);
          }}
          {...panResponder.panHandlers}
        >
          {/* Bottom layer — unplayed, fills full width */}
          <View style={styles.barRow}>
            {barHeights.map((h, i) => (
              <View key={i} style={[styles.bar, { height: h, backgroundColor: unplayedColor }]} />
            ))}
          </View>

          {/* Top layer — played color, revealed left-to-right by the animation */}
          <Animated.View
            style={[StyleSheet.absoluteFill, { width: animatedWidth, overflow: "hidden" }]}
            pointerEvents="none"
          >
            <View style={[styles.barRow, { width: containerWidth || 9999 }]}>
              {barHeights.map((h, i) => (
                <View key={i} style={[styles.bar, { height: h, backgroundColor: colors.primary }]} />
              ))}
            </View>
          </Animated.View>

          {/* Playhead — only visible while playing */}
          {playing && (
            <Animated.View
              style={[styles.playhead, { left: animatedWidth, backgroundColor: colors.primary }]}
              pointerEvents="none"
            />
          )}
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  player: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  right: {
    flex: 1,
    paddingHorizontal: 6
  },
  waveformRow: {
    height: MAX_BAR_HEIGHT + 8,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    height: MAX_BAR_HEIGHT + 8,
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: 2,
    marginHorizontal: BAR_MARGIN,
    alignSelf: "center",
  },
  playhead: {
    position: "absolute",
    top: -4,
    bottom: -4,
    width: 1.5,
    borderRadius: 1,
    opacity: 0.85,
  },
});
