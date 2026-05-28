import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Share,
  Animated,
  Easing,
} from "react-native";
import * as Notifications from "expo-notifications";
import { useState, useEffect, useRef, useMemo } from "react";
import { getStoredPassphrase } from "@/utils/passphrase";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ROUTES, fonts } from "@/constants";
import { useTheme } from "@/hooks/useTheme";
import { RecipientsSection, RecipientsModal } from "@/components/capsule/RecipientsSection";
import { getCountdown, getProgress, formatLongDate } from "@/utils/date";
import { toWords } from "@/utils/numberWords";
import { unlockCapsule } from "@/services/capsules";
import { normalizeCapsule } from "@/utils/normalize";
import { useAuth } from "@/hooks/useAuth";
import { hapticSuccess, hapticError } from "@/utils/haptics";
import PillButton from "@/components/ui/PillButton";
import Glitters from "@/components/Glitters";
import ShareOverlay from "@/components/ShareOverlay";
import { captureRef } from "react-native-view-shot";

// ─── helpers ─────────────────────────────────────────────────────────────────

function isExpired(unlocksAt) {
  return new Date() >= new Date(unlocksAt);
}


// ─── SealLogo styles ──────────────────────────────────────────────────────────

const makeSealStyles = (colors) => StyleSheet.create({
  container: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 24,
  },
  outerRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    borderStyle: "dashed",
  },
  middleRing: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    borderColor: `${colors.primary}55`,
  },
  glowRing: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  inner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1.5,
    borderColor: `${colors.primary}70`,
    alignItems: "center",
    justifyContent: "center",
  },
  ringDot: {
    position: "absolute",
    bottom: 8,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});

// ─── SealLogo ─────────────────────────────────────────────────────────────────

function SealLogo({ unlockable }) {
  const { colors } = useTheme();
  const sealStyles = useMemo(() => makeSealStyles(colors), [colors]);
  return (
    <View style={sealStyles.container}>
      <View
        style={[
          sealStyles.outerRing,
          unlockable && { borderColor: `${colors.primary}70`, borderStyle: "solid" },
        ]}
      />
      <View
        style={[
          sealStyles.middleRing,
          unlockable && { borderColor: colors.primary },
        ]}
      />
      <View
        style={[
          sealStyles.inner,
          unlockable && {
            backgroundColor: `${colors.primary}30`,
            borderColor: colors.primary,
          },
        ]}
      >
        <Ionicons
          name={unlockable ? "lock-open" : "lock-closed"}
          size={24}
          color={colors.primary}
        />
      </View>
      {unlockable && <View style={sealStyles.glowRing} />}
      <View style={sealStyles.ringDot} />
    </View>
  );
}

// ─── ScrambleWord (same as SealingOverlay) ────────────────────────────────────

const ALPHA = "abcdefghijklmnopqrstuvwxyz";

function ScrambleWord({ word, delay = 0, style, onDone }) {
  const [display, setDisplay] = useState(ALPHA.slice(0, Math.max(word.length, 1)));
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(op, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      const steps = 18;
      const stepMs = 65;
      let step = 0;
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
              c === " " ? " " : i < revealed ? c : ALPHA[Math.floor(Math.random() * 26)]
            ).join("")
          );
        }
      }, stepMs);
    }, delay);
    return () => clearTimeout(t);
  }, []);

  return <Animated.Text style={[style, { opacity: op }]}>{display}</Animated.Text>;
}

// ─── AnimatedCountdown ────────────────────────────────────────────────────────
// Scrambles in on mount, then switches to plain live-updating text.

function cdPlural(n, word) {
  return n === 1 ? word : word + "s";
}

function getCountdownUnits(cd) {
  return [
    cd.years > 0 && { key: "years",   value: cd.years,  label: cdPlural(cd.years,   "year")   },
    cd.days  > 0 && { key: "days",    value: cd.days,   label: cdPlural(cd.days,    "day")    },
    cd.hours > 0 && { key: "hours",   value: cd.hours,  label: cdPlural(cd.hours,   "hour")   },
    cd.mins  > 0 && { key: "minutes", value: cd.mins,   label: cdPlural(cd.mins,    "minute") },
  ].filter(Boolean);
}

function AnimatedCountdown({ countdown, valueStyle, labelStyle, dotStyle, exitOpacity }) {
  const UNITS = getCountdownUnits(countdown);

  const total = Math.max(1, UNITS.length * 2);
  const doneRef = useRef(0);
  const [animDone, setAnimDone] = useState(false);

  const onWordDone = () => {
    doneRef.current++;
    if (doneRef.current >= total) setAnimDone(true);
  };

  return (
    <>
      {UNITS.map(({ key, label, value }, i) => (
        <Animated.View key={key} style={{ gap: 1, opacity: exitOpacity }}>
          {!animDone ? (
            <>
              <ScrambleWord word={toWords(value)} delay={i * 750} style={valueStyle} onDone={onWordDone} />
              <ScrambleWord word={label} delay={i * 750 + 420} style={labelStyle} onDone={onWordDone} />
            </>
          ) : (
            <>
              <Text style={valueStyle}>{toWords(countdown[key === "minutes" ? "mins" : key] ?? 0)}</Text>
              <Text style={labelStyle}>{cdPlural(countdown[key === "minutes" ? "mins" : key] ?? 0, key === "minutes" ? "minute" : key.slice(0, -1))}</Text>
            </>
          )}
          {i < UNITS.length - 1 && <Text style={dotStyle}>·</Text>}
        </Animated.View>
      ))}
    </>
  );
}

// ─── ReadyState ───────────────────────────────────────────────────────────────

const LINES = [
  "we know the world has changed\na lot in this time",
  "but we also believe your heart\nhas stayed the same since the\nmoment you locked this!",
];

function ReadyState({ capsule, onReady, TEXT_PRIMARY, TEXT_DIM, GOLD, serifBold, serif, exitOpacity }) {
  // Elapsed time = unlock date - sealed date
  const elapsed    = Math.max(0, new Date(capsule.unlocksAt) - new Date(capsule.sealedAt));
  const totalSecs  = Math.floor(elapsed / 1000);
  const elYears    = Math.floor(totalSecs / (365 * 86400));
  const elRemSecs  = totalSecs - elYears * 365 * 86400;
  const elDays     = Math.floor(elRemSecs / 86400);
  const elHours    = Math.floor((elRemSecs % 86400) / 3600);
  const elMins     = Math.floor((elRemSecs % 3600) / 60);

  const units = [
    { value: elYears, unit: cdPlural(elYears, "year")   },
    { value: elDays,  unit: cdPlural(elDays,  "day")    },
    { value: elHours, unit: cdPlural(elHours, "hour")   },
    { value: elMins,  unit: cdPlural(elMins,  "minute") },
  ].filter(u => u.value > 0);

  // One animated value per line + the scramble done gate
  const lineAnims = useRef(LINES.map(() => ({
    op: new Animated.Value(0),
    y:  new Animated.Value(20),
  }))).current;

  const totalScramble = useRef(units.length * 2); // word + unit label
  const doneCount = useRef(0);

  const onScrambleDone = () => {
    doneCount.current++;
    if (doneCount.current < totalScramble.current) return;

    // All words scrambled — animate lines in sequence
    const seq = lineAnims.flatMap((anim, i) => [
      Animated.delay(i === 0 ? 300 : 400),
      Animated.parallel([
        Animated.timing(anim.op, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(anim.y,  { toValue: 0, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]);

    Animated.sequence([
      ...seq,
      Animated.delay(500),
    ]).start(() => onReady?.());
  };

  // Edge case: no elapsed time units
  useEffect(() => {
    if (units.length === 0) {
      setTimeout(() => onScrambleDone(), 200);
    }
  }, []);

  return (
    <View style={{ flex: 1, paddingVertical: 24, gap: 0 }}>
      {/* Elapsed duration — exitOpacity applied directly on each unit wrapper */}
      <View style={{ gap: 4, marginBottom: 32 }}>
        {units.map(({ value, unit }, i) => (
          <Animated.View key={unit} style={{ opacity: exitOpacity }}>
            <ScrambleWord
              word={toWords(value)}
              delay={i * 750}
              style={{ fontFamily: serifBold, fontSize: 38, lineHeight: 44, color: TEXT_PRIMARY, textTransform: "lowercase" }}
              onDone={onScrambleDone}
            />
            <ScrambleWord
              word={unit}
              delay={i * 750 + 420}
              style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", fontWeight: "600", color: GOLD }}
              onDone={onScrambleDone}
            />
            {i < units.length - 1 && (
              <Text style={{ fontSize: 16, color: `${GOLD}50`, marginVertical: 2 }}>·</Text>
            )}
          </Animated.View>
        ))}
      </View>

      {/* Lines — enter via lineAnims, exit via exitOpacity on wrapper */}
      {LINES.map((line, i) => (
        <Animated.View
          key={i}
          style={{ opacity: exitOpacity, transform: [{ translateY: lineAnims[i].y }] }}
        >
          <Animated.Text
            style={{
              fontFamily: serif,
              fontSize: 16,
              lineHeight: 26,
              color: TEXT_DIM,
              marginBottom: 20,
              fontStyle: "italic",
              opacity: lineAnims[i].op,
            }}
          >
            {line}
          </Animated.Text>
        </Animated.View>
      ))}
    </View>
  );
}

// ─── main styles ─────────────────────────────────────────────────────────────

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    fontSize: 10,
    letterSpacing: 2.5,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  // ── Content (matches overlay: space-between top/bottom) ──
  content: {
    flexGrow: 1,
    paddingHorizontal: 40,
    paddingTop: 16,
    paddingBottom: 16,
  },
  fromText: {
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    fontWeight: "600",
    marginBottom: 6,
  },
  capsuleTitle: {
    fontSize: 26,
    lineHeight: 32,
    marginBottom: 8,
  },
  capsuleDescription: {
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 28,
    fontStyle: "italic",
  },
  // ── Lettered countdown (identical to overlay) ──
  unlockBtnWrap: {
    width: "100%",
  },
  countdownBlock: {
    marginTop: 24,
    marginBottom: 28,
  },
  letteredUnit: {
    gap: 1,
  },
  letteredValue: {
    fontSize: 36,
    lineHeight: 46,
    textTransform: "lowercase",
    lineCount: 2
  },
  letteredLabel: {
    fontSize: 11,
    letterSpacing: 3,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  letteredDot: {
    fontSize: 18,
    lineHeight: 20,
    marginVertical: 1,
  },
  // ── Progress (thin like overlay) ──
  progressRow: {
    width: "100%",
    marginBottom: 20,
  },
  progressTrack: {
    height: 2,
    borderRadius: 1,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 1,
  },
  // ── Unlock sentence (identical to overlay) ──
  unlockSentenceBlock: {
    gap: 4,
    marginBottom: 32,
  },
  unlockSentence: {
    fontSize: 13,
    letterSpacing: 0.3,
  },
  unlockDate: {
    fontSize: 18,
    letterSpacing: 0.5,
  },
  remindedText: {
    fontSize: 14,
    letterSpacing: 0.3,
    marginTop: 6,
    fontStyle: "italic",
  },
  recipientsSection: {
    width: "100%",
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "stretch",
  },
  reminderBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  reminderBtnText: {
    fontSize: 14,
    fontWeight: "400",
    letterSpacing: 1.5,
  },
  addRecipientBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  passphraseCard: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    gap: 14,
  },
  passphraseIconRow: {
    alignItems: "center",
    marginBottom: 4,
  },
  passphraseTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: colors.foreground,
    textAlign: "center",
    fontFamily: fonts.serif,
  },
  passphraseSubtitle: {
    fontSize: 13,
    color: colors.mutedFg,
    textAlign: "center",
    lineHeight: 20,
  },
  passphraseInput: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.foreground,
    fontSize: 15,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    letterSpacing: 2,
    marginTop: 4,
  },
  passphraseActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  passphraseCancelBtn: {
    flex: 1,
    backgroundColor: colors.secondaryBackground,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  passphraseCancelText: {
    fontSize: 14,
    color: colors.mutedFg,
    fontWeight: "500",
  },
  passphraseConfirmBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  passphraseConfirmText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primaryFg,
    letterSpacing: 1.5,
  },
  passphraseHintBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: `${colors.mutedFg}12`,
    borderRadius: 8,
    padding: 10,
  },
  passphraseHintText: {
    flex: 1,
    fontSize: 12,
    color: colors.mutedFg,
    lineHeight: 18,
  },
  prefilledNote: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.primary,
    textAlign: "center",
    marginTop: -4,
  },
  pinButton: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 12,
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
});

// ─── PassphraseModal ──────────────────────────────────────────────────────────

function PassphraseModal({ visible, onConfirm, onDismiss, loading, prefilled, hint }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (visible && prefilled) setValue(prefilled);
  }, [visible, prefilled]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={onDismiss}>
        <Pressable style={styles.passphraseCard} onPress={() => {}}>
          <View style={styles.passphraseIconRow}>
            <Ionicons name="key-outline" size={24} color={colors.primary} />
          </View>
          <Text style={styles.passphraseTitle}>Enter Passphrase</Text>
          <Text style={styles.passphraseSubtitle}>
            This capsule was sealed with self-encryption. Enter the passphrase to
            decrypt its contents.
          </Text>
          {!!hint && (
            <View style={styles.passphraseHintBox}>
              <Ionicons name="bulb-outline" size={13} color={colors.mutedFg} />
              <Text style={styles.passphraseHintText}>Hint: {hint}</Text>
            </View>
          )}
          <TextInput
            style={styles.passphraseInput}
            placeholder="Your passphrase..."
            placeholderTextColor={colors.mutedFg}
            value={value}
            onChangeText={setValue}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus={!prefilled}
          />
          {!!prefilled && (
            <Text style={styles.prefilledNote}>
              Pre-filled from your saved passphrase.
            </Text>
          )}
          <View style={styles.passphraseActions}>
            <Pressable onPress={onDismiss} style={styles.passphraseCancelBtn}>
              <Text style={styles.passphraseCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(value)}
              disabled={loading || !value.trim()}
              style={[
                styles.passphraseConfirmBtn,
                (!value.trim() || loading) && { opacity: 0.5 },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.primaryFg} />
              ) : (
                <Text style={styles.passphraseConfirmText}>OPEN</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── main screen ─────────────────────────────────────────────────────────────

export default function LockedCapsuleScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation();
  const route = useRoute();
  const { capsule } = route.params;
  const { user } = useAuth();

  const [countdown, setCountdown] = useState(getCountdown(capsule.unlocksAt));
  const [unlockable, setUnlockable] = useState(isExpired(capsule.unlocksAt));
  const progress = getProgress(capsule.sealedAt, capsule.unlocksAt);

  const [opening, setOpening] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [storedPassphrase, setStoredPassphrase] = useState(null);

  // Per-section animated opacity values for the exit animation
  const aFrom      = useRef(new Animated.Value(1)).current;
  const aTitle     = useRef(new Animated.Value(1)).current;
  const aDesc      = useRef(new Animated.Value(1)).current;
  const aCountdown = useRef(new Animated.Value(1)).current;
  const aProgress  = useRef(new Animated.Value(1)).current;
  const aSentence  = useRef(new Animated.Value(1)).current;
  const aReady     = useRef(new Animated.Value(1)).current; // ReadyState content

  // Try to pre-fill passphrase from SecureStore (stored at seal time for 7 days)
  useEffect(() => {
    if (capsule.encryptionType === "self") {
      getStoredPassphrase(capsule._id || capsule.id).then((p) => {
        if (p) setStoredPassphrase(p);
      });
    }
  }, [capsule._id, capsule.id, capsule.encryptionType]);

  // Tick every second; flip unlockable as soon as time is up
  useEffect(() => {
    const interval = setInterval(() => {
      const cd = getCountdown(capsule.unlocksAt);
      setCountdown(cd);
      if (!unlockable && isExpired(capsule.unlocksAt)) {
        setUnlockable(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [unlockable]);

  // ── open flow ─────────────────────────────────────────────────────────────

  const handleOpenPress = () => {
    if (capsule.encryptionType === "self") {
      setShowPassphrase(true);
    } else {
      animateAndUnlock(null);
    }
  };

  // Fade sections out bottom→top, concurrently with the API call.
  // Navigates once BOTH the animation AND the API call finish.
  const animateAndUnlock = async (passphrase) => {
    setShowPassphrase(false);
    setOpening(true);

    // Bottom-to-top exit stagger — slow and dramatic
    const fadeOut = (anim) =>
      Animated.timing(anim, { toValue: 0, duration: 500, easing: Easing.in(Easing.cubic), useNativeDriver: true });

    const exitAnim = new Promise(resolve =>
      Animated.stagger(140, [
        fadeOut(btnOpacity),
        fadeOut(aSentence),
        fadeOut(aProgress),
        fadeOut(aCountdown),
        fadeOut(aReady),   // ReadyState elapsed-time letters + prose lines
        fadeOut(aDesc),
        fadeOut(aTitle),
        fadeOut(aFrom),
      ]).start(resolve)
    );

    const apiCall = unlockCapsule(capsule._id || capsule.id, passphrase)
      .then(raw => normalizeCapsule(raw, user?.id));

    try {
      const [unlocked] = await Promise.all([apiCall, exitAnim]);
      hapticSuccess();
      navigation.replace(ROUTES.UNLOCKED_CAPSULE, { capsule: unlocked });
    } catch (err) {
      hapticError();
      // Fade everything back in on failure
      Animated.parallel([aFrom, aTitle, aDesc, aCountdown, aProgress, aSentence, aReady, btnOpacity].map(a =>
        Animated.timing(a, { toValue: 1, duration: 300, useNativeDriver: true })
      )).start();
      const msg = err?.response?.data?.error || err?.response?.data?.detail || "Failed to open capsule.";
      Alert.alert("Could not open", msg);
    } finally {
      setOpening(false);
    }
  };

  // Passphrase capsules call this after the modal
  const doUnlock = (passphrase) => animateAndUnlock(passphrase);

  const [reminderSet, setReminderSet] = useState(false);
  const [recipientsOpen, setRecipientsOpen] = useState(false);
  const [recipients, setRecipients] = useState(capsule.recipients ?? []);
  const viewRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [shareImageUri, setShareImageUri] = useState(null);
  const [showShareOverlay, setShowShareOverlay] = useState(false);
  const [btnVisible, setBtnVisible] = useState(false);
  const btnOpacity = useRef(new Animated.Value(0)).current;

  const handleSetReminder = async () => {
    const unlockDate = new Date(capsule.unlocksAt);
    if (unlockDate <= new Date()) {
      Alert.alert("Already unlockable", "This capsule is ready to open now.");
      return;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow notifications in Settings to set a reminder.");
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Your capsule is ready 🎁",
        body: capsule.title ? `"${capsule.title}" is now unlocked.` : "A capsule you sealed is ready to open.",
        data: { capsuleId: capsule._id || capsule.id },
      },
      trigger: { date: unlockDate },
    });

    setReminderSet(true);
    Alert.alert("Reminder set", `You'll be notified when this capsule unlocks on ${formatLongDate(capsule.unlocksAt)}.`);
  };

  const handleShare = async () => {
    try {
      setIsCapturing(true);
      await new Promise(resolve => setTimeout(resolve, 80));

      const uri = await captureRef(viewRef, { format: "png", quality: 0.95 });

      setIsCapturing(false);
      setShareImageUri(uri);
      setShowShareOverlay(true);
    } catch (_) {
      setIsCapturing(false);
    }
  };


  const TEXT_PRIMARY = isDark ? "#F5EFE6" : "#1A1816";
  const TEXT_DIM     = isDark ? "rgba(245,239,230,0.45)" : "rgba(26,24,22,0.45)";
  const BG           = isDark ? "#0D0C0A" : "#FAF8F4";

  return (
    <View ref={viewRef} style={[styles.container, { backgroundColor: BG }]} collapsable={false}>
      {/* Glitters — same as sealing overlay */}
      <Glitters color={`${colors.primary}80`} />

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        {/* Header — hidden during screenshot capture */}
        {!isCapturing ? (
          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
              <Ionicons name="chevron-back" size={24} color={TEXT_PRIMARY} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: TEXT_DIM }]}>
              {unlockable ? "READY TO OPEN" : "SEALED CAPSULE"}
            </Text>
            <Pressable onPress={handleShare} style={styles.headerBtn}>
              <Ionicons name="share-outline" size={22} color={TEXT_PRIMARY} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.header} />
        )}

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* From */}
          <Animated.View style={{ opacity: aFrom }}>
            {capsule.from === "You" || capsule.createdBy === user?.id ? (
              <Text style={[styles.fromText, { color: TEXT_DIM }]}>A NOTE TO YOUR FUTURE</Text>
            ) : (
              <Text style={[styles.fromText, { color: TEXT_DIM }]}>FROM {capsule.from.toUpperCase()}</Text>
            )}
          </Animated.View>

          {/* Title */}
          <Animated.View style={{ opacity: aTitle }}>
            <Text style={[styles.capsuleTitle, { color: TEXT_PRIMARY, fontFamily: fonts.serifBold }]}>
              {capsule.title}
            </Text>
          </Animated.View>

          {/* Description */}
          {!!capsule.description && (capsule.from === "You" || capsule.createdBy === user?.id) && (
            <Animated.View style={{ opacity: aDesc }}>
              <Text style={[styles.capsuleDescription, { color: TEXT_DIM, fontFamily: fonts.serif }]}>
                {capsule.description}
              </Text>
            </Animated.View>
          )}

          {/* ── Lettered countdown / ready state ── */}
          {unlockable ? (
            <ReadyState
              capsule={capsule}
              TEXT_PRIMARY={TEXT_PRIMARY}
              TEXT_DIM={TEXT_DIM}
              GOLD={colors.primary}
              serifBold={fonts.serifBold}
              serif={fonts.serif}
              exitOpacity={aReady}
              onReady={() => {
                setBtnVisible(true);
                Animated.timing(btnOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();
              }}
            />
          ) : (
            <>
              <View style={styles.countdownBlock}>
                <AnimatedCountdown
                  countdown={countdown}
                  exitOpacity={aCountdown}
                  valueStyle={[styles.letteredValue, { fontFamily: fonts.serifBold, color: TEXT_PRIMARY }]}
                  labelStyle={[styles.letteredLabel, { color: colors.primary }]}
                  dotStyle={[styles.letteredDot, { color: `${colors.primary}50` }]}
                />
              </View>

              <Animated.View style={[styles.progressRow, { opacity: aProgress }]}>
                <View style={[styles.progressTrack, { backgroundColor: `${colors.primary}18` }]}>
                  <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: colors.primary }]} />
                </View>
              </Animated.View>

              <Animated.View style={[styles.unlockSentenceBlock, { opacity: aSentence }]}>
                <Text style={[styles.unlockSentence, { color: TEXT_DIM, fontFamily: fonts.serif }]}>
                  Your memory will unlock on
                </Text>
                <Text style={[styles.unlockDate, { color: TEXT_PRIMARY, fontFamily: fonts.serifBold }]}>
                  {formatLongDate(capsule.unlocksAt)}
                </Text>
                {reminderSet && (
                  <Text style={[styles.remindedText, { color: TEXT_DIM, fontFamily: fonts.serif }]}>
                    and you will be reminded!
                  </Text>
                )}
              </Animated.View>
            </>
          )}

          {/* Action row — only shown when still locked */}
          {!unlockable && !reminderSet && !isCapturing ? (
            /* SET REMINDER + add-recipient — hidden during screenshot capture */
            <View style={styles.actionRow}>
              <Pressable
                onPress={handleSetReminder}
                style={({ pressed }) => [
                  styles.reminderBtn,
                  { borderColor: `${colors.primary}50`, opacity: pressed ? 0.7 : 1 },
                ]}
                accessibilityLabel="Set reminder"
              >
                <Ionicons name="notifications" size={17} color={`${colors.primary}AA`} />
                <Text style={[styles.reminderBtnText, { color: `${colors.primary}AA` }]}>
                  SET REMINDER
                </Text>
              </Pressable>

              {!capsule.isPublic && (
                <Pressable
                  onPress={() => setRecipientsOpen(true)}
                  style={[styles.addRecipientBtn, { borderColor: `${colors.primary}50` }]}
                  accessibilityLabel="Add recipient"
                >
                  <Ionicons name="person-add-outline" size={18} color={colors.primary} />
                </Pressable>
              )}
            </View>
          ) : null}

          {/* Recipients modal — opened by icon button */}
          {!capsule.isPublic && (
            <RecipientsModal
              visible={recipientsOpen}
              capsuleId={capsule._id || capsule.id}
              recipients={recipients}
              onClose={() => setRecipientsOpen(false)}
              onChanged={setRecipients}
            />
          )}
        </ScrollView>

        {/* UNLOCK button — fades in after animation sequence completes */}
        {unlockable && btnVisible && (
          <Animated.View style={[styles.unlockBtnWrap, { paddingBottom: 24, paddingHorizontal: 40, opacity: btnOpacity }]}>
            <PillButton
              label={opening ? "Unlocking..." : "UNLOCK CAPSULE"}
              onPress={handleOpenPress}
              loading={opening}
              fullWidth
              size="lg"
            />
          </Animated.View>
        )}
      </SafeAreaView>

      {/* Passphrase modal */}
      <PassphraseModal
        visible={showPassphrase}
        loading={opening}
        onConfirm={doUnlock}
        onDismiss={() => setShowPassphrase(false)}
        prefilled={storedPassphrase}
        hint={capsule.passphraseHint}
      />

      {/* Social share overlay */}
      <ShareOverlay
        visible={showShareOverlay}
        imageUri={shareImageUri}
        onClose={() => setShowShareOverlay(false)}
      />
    </View>
  );
}

// styles defined above sub-components (see makeStyles before CountdownUnit)
