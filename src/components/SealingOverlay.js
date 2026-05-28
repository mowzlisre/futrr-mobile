import {
  View, Text, Modal, StyleSheet, Animated,
  Easing, Pressable, Alert,
} from "react-native";
import { useEffect, useRef, useState, useMemo } from "react";
import Glitters from "@/components/Glitters";
import { useTheme } from "@/hooks/useTheme";
import { fonts } from "@/constants";
import { toWords } from "@/utils/numberWords";

// ─── Date formatting ──────────────────────────────────────────────────────────
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function fmtUnlockDate(d) {
  if (!(d instanceof Date) || isNaN(d)) return "";
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function breakdown(target) {
  const ms      = Math.max(0, (target instanceof Date ? target : new Date(target)) - Date.now());
  const total   = Math.floor(ms / 1000);
  const years   = Math.floor(total / (365 * 86400));
  const remSecs = total - years * 365 * 86400;
  const days    = Math.floor(remSecs / 86400);
  const hours   = Math.floor((remSecs % 86400) / 3600);
  const minutes = Math.floor((remSecs % 3600) / 60);
  return { years, days, hours, minutes };
}

function plural(n, word) {
  return n === 1 ? word : word + "s";
}

// ─── Scramble word ────────────────────────────────────────────────────────────
const ALPHA = "abcdefghijklmnopqrstuvwxyz";

function ScrambleWord({ word, delay, style, onDone }) {
  const [display, setDisplay] = useState(() => ALPHA.slice(0, word.length).split("").join(""));
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t0 = setTimeout(() => {
      // Slow fade-in before scramble begins
      Animated.timing(op, { toValue: 1, duration: 600, useNativeDriver: true }).start();

      const steps  = 18;   // more steps → longer scramble
      const stepMs = 70;   // slower per-step → more readable
      let   step   = 0;

      const iv = setInterval(() => {
        step++;
        if (step >= steps) {
          clearInterval(iv);
          setDisplay(word);
          onDone?.();
        } else {
          const revealed = Math.floor((step / steps) * word.length);
          setDisplay(
            Array.from(word).map((c, i) =>
              c === " " ? " " : i < revealed
                ? c
                : ALPHA[Math.floor(Math.random() * 26)]
            ).join("")
          );
        }
      }, stepMs);
    }, delay);

    return () => clearTimeout(t0);
  }, []);

  return (
    <Animated.Text style={[style, { opacity: op }]}>
      {display}
    </Animated.Text>
  );
}

// ─── Main overlay ─────────────────────────────────────────────────────────────
// Theme-aware text colours — set per-render based on isDark
const DARK_TEXT  = "#F5EFE6";
const DARK_DIM   = "rgba(245,239,230,0.45)";
const LIGHT_TEXT = "#1A1816";
const LIGHT_DIM  = "rgba(26,24,22,0.45)";

export default function SealingOverlay({
  visible,
  sealed     = false,
  sealError  = null,   // error string — shows alert and closes overlay
  unlockDate = new Date(),
  onDone,
}) {
  const { colors, isDark } = useTheme();
  const GOLD     = colors.primary;
  const TEXT_PRIMARY = isDark ? DARK_TEXT  : LIGHT_TEXT;
  const TEXT_DIM     = isDark ? DARK_DIM   : LIGHT_DIM;

  // Phase: idle → scrambling → waiting → done
  const [phase,    setPhase]    = useState("idle");
  const [showBar,  setShowBar]  = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [showBtn,  setShowBtn]  = useState(false);
  const sealedRef  = useRef(false);

  // Animated values
  const barOp    = useRef(new Animated.Value(1)).current;  // progress bar opacity exit
  const barScaleX = useRef(new Animated.Value(1)).current; // progress bar scale exit
  const dateOp   = useRef(new Animated.Value(0)).current;
  const dateY    = useRef(new Animated.Value(48)).current; // start lower for from-bottom feel
  const btnOp    = useRef(new Animated.Value(0)).current;
  const btnY     = useRef(new Animated.Value(30)).current;
  const progress  = useRef(new Animated.Value(0)).current; // 0 → 1

  // Word list
  const { years, days, hours, minutes } = breakdown(unlockDate);
  const lines = [
    years   > 0 && { text: toWords(years),   unit: plural(years,   "year")   },
    days    > 0 && { text: toWords(days),     unit: plural(days,    "day")    },
    hours   > 0 && { text: toWords(hours),    unit: plural(hours,   "hour")   },
    minutes > 0 && { text: toWords(minutes),  unit: plural(minutes, "minute") },
  ].filter(Boolean);

  const wordDelays = [];
  lines.forEach((_, i) => {
    wordDelays.push(i * 750);
    wordDelays.push(i * 750 + 420);
  });
  const lastWordDone = wordDelays[wordDelays.length - 1] + 14 * 55 + 50;

  const START_DELAY = 400;

  // ── Reset on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    sealedRef.current = false;
    barOp.setValue(1); barScaleX.setValue(1);
    dateOp.setValue(0); dateY.setValue(48);
    btnOp.setValue(0);  btnY.setValue(30);
    progress.setValue(0);
    setShowBar(false);
    setShowDate(false);
    setShowBtn(false);
    setPhase("idle");
    const t = setTimeout(() => {
      setShowBar(true);
      setPhase("scrambling");
    }, START_DELAY);
    return () => clearTimeout(t);
  }, [visible]);

  // ── sealError — alert then close ──────────────────────────────────────────
  useEffect(() => {
    if (!sealError) return;
    Alert.alert(
      "Capsule Locking Failed",
      sealError || "Something went wrong while sealing your capsule. Please try again.",
      [{ text: "OK", onPress: onDone }]
    );
  }, [sealError]);

  // ── sealed = true → exit bar, show date from bottom ──────────────────────
  useEffect(() => {
    if (!sealed) return;
    sealedRef.current = true;
    if (phase === "waiting") exitBarThenReveal();
  }, [sealed, phase]);

  // ── Scramble phase: fill bar, then enter waiting ──────────────────────────
  useEffect(() => {
    if (phase !== "scrambling") return;

    Animated.timing(progress, {
      toValue: 1,
      duration: lastWordDone,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    const t = setTimeout(() => {
      if (sealedRef.current) exitBarThenReveal();
      else setPhase("waiting");
    }, lastWordDone);
    return () => clearTimeout(t);
  }, [phase]);

  // ── Smooth bar exit → date fade-in from bottom → button ──────────────────
  function exitBarThenReveal() {
    // Animate bar out: fade + shrink toward left
    Animated.parallel([
      Animated.timing(barOp,    { toValue: 0, duration: 350, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(barScaleX,{ toValue: 0, duration: 400, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => {
      setShowBar(false);
      // Date slides up from bottom
      setShowDate(true);
      Animated.parallel([
        Animated.timing(dateOp, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(dateY,  { toValue: 0, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start(() => revealButton());
    });
  }

  function revealButton() {
    setPhase("done");
    setShowBtn(true);
    Animated.parallel([
      Animated.timing(btnOp, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(btnY,  { toValue: 0, duration: 600, easing: Easing.out(Easing.back(1.3)), useNativeDriver: true }),
    ]).start();
  }

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: isDark ? "#0D0C0A" : "#FAF8F4" }]}>

        {/* ── Glitters ───────────────────────────────────────────── */}
        <Glitters color={`${GOLD}90`} />

        {/* ── Scrollable content center ──────────────────────────── */}
        <View style={styles.center}>
          {lines.map((line, i) => (
            <View key={i} style={styles.lineGroup}>
              {/* Number word — scrambles in */}
              <ScrambleWord
                word={line.text}
                delay={wordDelays[i * 2]}
                style={[styles.numberWord, { fontFamily: fonts.serifBold, color: TEXT_PRIMARY }]}
              />
              {/* Unit label — scrambles in after */}
              <ScrambleWord
                word={line.unit}
                delay={wordDelays[i * 2 + 1]}
                style={[styles.unitLabel, { fontFamily: fonts.serif, color: GOLD }]}
              />
            </View>
          ))}
        </View>

        {/* ── Progress bar (fades + shrinks out on success) ───────── */}
        {showBar && (
          <Animated.View
            style={[
              styles.progressTrack,
              { opacity: barOp, transform: [{ scaleX: barScaleX }] },
            ]}
          >
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: GOLD,
                  width: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </Animated.View>
        )}

        {/* ── Bottom: unlock date + button ──────────────────────── */}
        <View style={styles.bottom}>
          {/* Unlock sentence */}
          {showDate && (
            <Animated.View
              style={[styles.unlockBlock, { opacity: dateOp, transform: [{ translateY: dateY }] }]}
            >
              <Text style={[styles.unlockSentence, { color: TEXT_DIM, fontFamily: fonts.serif }]}>
                Your memory will unlock on
              </Text>
              <Text style={[styles.unlockDateText, { color: TEXT_PRIMARY, fontFamily: fonts.serifBold }]}>
                {fmtUnlockDate(unlockDate instanceof Date ? unlockDate : new Date(unlockDate))}
              </Text>
            </Animated.View>
          )}

          {/* Close button */}
          {showBtn && (
            <Animated.View style={{ opacity: btnOp, transform: [{ translateY: btnY }] }}>
              <Pressable
                onPress={onDone}
                style={({ pressed }) => [
                  styles.closeBtn,
                  { borderColor: `${GOLD}70`, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.closeBtnText, { color: TEXT_PRIMARY, fontFamily: fonts.serif }]}>
                  close
                </Text>
              </Pressable>
            </Animated.View>
          )}
        </View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 72,
    paddingHorizontal: 40,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    gap: 28,
  },
  lineGroup: {
    gap: 4,
  },
  numberWord: {
    fontSize: 38,
    lineHeight: 44,
    textTransform: "lowercase",
  },
  unitLabel: {
    fontSize: 13,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  progressTrack: {
    width: "100%",
    height: 2,
    backgroundColor: "rgba(245,239,230,0.10)",
    borderRadius: 1,
    overflow: "hidden",
    marginBottom: 20,
  },
  progressFill: {
    height: "100%",
    borderRadius: 1,
  },
  bottom: {
    alignItems: "center",
    gap: 18,
    paddingTop: 4,
  },
  unlockBlock: {
    alignItems: "center",
    gap: 4,
  },
  unlockSentence: {
    fontSize: 13,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  unlockDateText: {
    fontSize: 18,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  closeBtn: {
    paddingHorizontal: 36,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1,
  },
  closeBtnText: {
    fontSize: 17,
    letterSpacing: 1.5,
  },
});
