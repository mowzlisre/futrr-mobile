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
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, ROUTES, fonts } from "@/constants";
import { getCountdown, getProgress, formatLongDate } from "@/utils/date";
import { unlockCapsule } from "@/services/capsules";
import { normalizeCapsule } from "@/utils/normalize";
import { useAuth } from "@/hooks/useAuth";

// ─── helpers ─────────────────────────────────────────────────────────────────

function isExpired(unlocksAt) {
  return new Date() >= new Date(unlocksAt);
}

// ─── SealLogo ─────────────────────────────────────────────────────────────────

function SealLogo({ unlockable }) {
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

const sealStyles = StyleSheet.create({
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

// ─── CountdownUnit ────────────────────────────────────────────────────────────

function CountdownUnit({ value, label, dim }) {
  return (
    <View style={styles.countdownUnit}>
      <Text style={[styles.countdownValue, dim && styles.countdownValueDim]}>
        {String(value).padStart(2, "0")}
      </Text>
      <Text style={styles.countdownLabel}>{label}</Text>
    </View>
  );
}

// ─── PassphraseModal ──────────────────────────────────────────────────────────

function PassphraseModal({ visible, onConfirm, onDismiss, loading }) {
  const [value, setValue] = useState("");

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
          <TextInput
            style={styles.passphraseInput}
            placeholder="Your passphrase..."
            placeholderTextColor={colors.mutedFg}
            value={value}
            onChangeText={setValue}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
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
  const navigation = useNavigation();
  const route = useRoute();
  const { capsule } = route.params;
  const { user } = useAuth();

  const [countdown, setCountdown] = useState(getCountdown(capsule.unlocksAt));
  const [unlockable, setUnlockable] = useState(isExpired(capsule.unlocksAt));
  const progress = getProgress(capsule.sealedAt, capsule.unlocksAt);

  const [opening, setOpening] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);

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
      doUnlock(null);
    }
  };

  const doUnlock = async (passphrase) => {
    try {
      setOpening(true);
      setShowPassphrase(false);
      const raw = await unlockCapsule(capsule._id || capsule.id, passphrase);
      const unlocked = normalizeCapsule(raw, user?.id);
      // Replace so the user can't navigate back to the locked view
      navigation.replace(ROUTES.UNLOCKED_CAPSULE, { capsule: unlocked });
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "Failed to open capsule. Check your passphrase and try again.";
      Alert.alert("Could not open", msg);
    } finally {
      setOpening(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {unlockable ? "READY TO OPEN" : "SEALED CAPSULE"}
        </Text>
        <Pressable style={styles.headerBtn}>
          <Ionicons name="share-outline" size={22} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Seal Logo — changes icon + glow when ready */}
        <SealLogo unlockable={unlockable} />

        {/* From */}
        <Text style={styles.fromText}>FROM {capsule.from.toUpperCase()}</Text>

        {/* Title */}
        <Text style={styles.capsuleTitle}>{capsule.title}</Text>

        {/* Status badge */}
        <View style={[styles.sealedBadge, unlockable && styles.readyBadge]}>
          <Ionicons
            name={unlockable ? "lock-open-outline" : "lock-closed"}
            size={13}
            color={unlockable ? colors.primary : colors.mutedFg}
          />
          <Text
            style={[
              styles.sealedBadgeText,
              unlockable && { color: colors.primary },
            ]}
          >
            {unlockable ? "This capsule is ready to open" : "Sealed · Cannot be opened early"}
          </Text>
        </View>

        {/* Countdown / ready card */}
        <View
          style={[
            styles.countdownCard,
            unlockable && { borderColor: `${colors.primary}40` },
          ]}
        >
          <Text style={[styles.opensIn, unlockable && { color: colors.primary }]}>
            {unlockable ? "TIME'S UP" : "OPENS IN"}
          </Text>

          <View style={styles.countdownRow}>
            <CountdownUnit value={countdown.days} label="DAYS" dim={unlockable} />
            <Text style={styles.countdownSep}>:</Text>
            <CountdownUnit value={countdown.hours} label="HRS" dim={unlockable} />
            <Text style={styles.countdownSep}>:</Text>
            <CountdownUnit value={countdown.mins} label="MIN" dim={unlockable} />
            <Text style={styles.countdownSep}>:</Text>
            <CountdownUnit value={countdown.secs} label="SEC" dim={unlockable} />
          </View>

          {/* Progress */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: unlockable
                      ? "100%"
                      : `${Math.round(progress * 100)}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {unlockable ? "100%" : `${Math.round(progress * 100)}%`}
            </Text>
          </View>

          <Text style={styles.unlocksOn}>
            {unlockable ? "Unlocked on " : "Unlocks on "}
            <Text style={styles.unlocksOnDate}>
              {formatLongDate(capsule.unlocksAt)}
            </Text>
          </Text>
        </View>

        {/* ── Open Capsule Button (only when unlockable) ─────────────────── */}
        {unlockable ? (
          <Pressable
            onPress={handleOpenPress}
            disabled={opening}
            style={styles.openButton}
          >
            <LinearGradient
              colors={[colors.primary, "#D4924A", colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.openGradient}
            >
              {opening ? (
                <ActivityIndicator color={colors.primaryFg} />
              ) : (
                <>
                  <Ionicons
                    name="lock-open-outline"
                    size={20}
                    color={colors.primaryFg}
                  />
                  <Text style={styles.openButtonText}>OPEN CAPSULE</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        ) : (
          /* Reminder Button (only while locked) */
          <Pressable style={styles.reminderButton}>
            <Ionicons
              name="notifications-outline"
              size={18}
              color={colors.foreground}
            />
            <Text style={styles.reminderText}>SET REMINDER</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Passphrase modal — only for self-encrypted capsules */}
      <PassphraseModal
        visible={showPassphrase}
        loading={opening}
        onConfirm={doUnlock}
        onDismiss={() => setShowPassphrase(false)}
      />
    </SafeAreaView>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

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
  headerTitle: {
    fontSize: 12,
    color: colors.mutedFg,
    letterSpacing: 2,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  fromText: {
    fontSize: 11,
    color: colors.mutedFg,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  capsuleTitle: {
    fontSize: 26,
    fontWeight: "300",
    color: colors.foreground,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 34,
    fontFamily: fonts.serif,
  },
  sealedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 32,
  },
  readyBadge: {
    backgroundColor: `${colors.primary}12`,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  sealedBadgeText: {
    fontSize: 12,
    color: colors.mutedFg,
  },
  countdownCard: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    marginBottom: 20,
  },
  opensIn: {
    fontSize: 10,
    color: colors.mutedFg,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  countdownRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    marginBottom: 20,
  },
  countdownUnit: {
    alignItems: "center",
    minWidth: 52,
  },
  countdownValue: {
    fontSize: 36,
    fontWeight: "600",
    color: colors.foreground,
    lineHeight: 40,
  },
  countdownValueDim: {
    color: colors.mutedFg,
    fontWeight: "300",
  },
  countdownLabel: {
    fontSize: 9,
    color: colors.mutedFg,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: 4,
  },
  countdownSep: {
    fontSize: 28,
    color: colors.mutedFg,
    fontWeight: "300",
    marginBottom: 14,
  },
  progressContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.secondaryBackground,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    color: colors.mutedFg,
    minWidth: 30,
    textAlign: "right",
  },
  unlocksOn: {
    fontSize: 12,
    color: colors.mutedFg,
  },
  unlocksOnDate: {
    color: colors.foreground,
    fontWeight: "500",
  },

  // ── open button
  openButton: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  openGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
  },
  openButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primaryFg,
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  // ── reminder button
  reminderButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reminderText: {
    fontSize: 13,
    color: colors.foreground,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // ── passphrase modal
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
});
