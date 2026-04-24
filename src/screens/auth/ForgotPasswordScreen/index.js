import {
  View, Text, TextInput, Pressable, StyleSheet, Animated, Easing,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { useState, useRef, useEffect, useMemo, useCallback, forwardRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { ROUTES, fonts } from "@/constants";
import { useTheme } from "@/hooks/useTheme";
import { forgotPassword, verifyResetOTP, resetPassword } from "@/services/auth";

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "One number", test: (p) => /\d/.test(p) },
];

// ─── NoFillInput ──────────────────────────────────────────────────────────────

const NoFillInput = forwardRef(function NoFillInput({ autoFocus, ...props }, fwd) {
  const innerRef = useRef(null);
  const ref = fwd || innerRef;
  useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => ref?.current?.focus(), 150);
    return () => clearTimeout(t);
  }, []);
  return (
    <TextInput
      ref={ref}
      textContentType="none"
      autoComplete="off"
      autoCorrect={false}
      spellCheck={false}
      {...props}
      style={[props.style, { overflow: "hidden" }]}
    />
  );
});

// ─── Step icon ────────────────────────────────────────────────────────────────

function StepIcon({ name }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={s.stepIconWrap}>
      <View style={s.stepIconGlow} />
      <View style={s.stepIconRing} />
      <View style={s.stepIconInner}>
        <Ionicons name={name} size={28} color={colors.primary} />
      </View>
    </View>
  );
}

// ─── OTP boxes ────────────────────────────────────────────────────────────────

function OTPBoxes({ value, onChange }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const refs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  const handleChange = (text, i) => {
    const digit = text.replace(/[^0-9]/g, "").slice(-1);
    const next = [...value];
    next[i] = digit;
    onChange(next);
    if (digit && i < 5) refs[i + 1].current?.focus();
  };

  const handleKey = (e, i) => {
    if (e.nativeEvent.key === "Backspace" && !value[i] && i > 0)
      refs[i - 1].current?.focus();
  };

  return (
    <View style={s.otpRow}>
      {value.map((digit, i) => (
        <NoFillInput
          key={i}
          ref={refs[i]}
          style={[s.otpBox, digit ? s.otpBoxFilled : null]}
          value={digit}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={(e) => handleKey(e, i)}
          keyboardType="number-pad"
          maxLength={1}
          textAlign="center"
          caretHidden
          selectionColor={colors.primary}
          autoFocus={i === 0}
        />
      ))}
    </View>
  );
}

// ─── CTA button ───────────────────────────────────────────────────────────────

function CTAButton({ label, onPress, loading, disabled }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.ctaWrap,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.85 },
      ]}
    >
      <LinearGradient
        colors={[colors.primary, "#D4924A", colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.cta}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.ctaText}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

// ─── Password rules ───────────────────────────────────────────────────────────

function PasswordRules({ password }) {
  const { colors } = useTheme();
  if (!password) return null;
  return (
    <View style={{ marginTop: 8, marginBottom: 12, gap: 4 }}>
      {PASSWORD_RULES.map((rule) => {
        const valid = rule.test(password);
        return (
          <View key={rule.label} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons
              name={valid ? "checkmark-circle" : "ellipse-outline"}
              size={16}
              color={valid ? colors.success : colors.mutedFg}
            />
            <Text style={{ fontSize: 12, color: valid ? colors.success : colors.mutedFg }}>
              {rule.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation();

  // Phase: "identifier" → "otp" → "reset" → "done"
  const [phase, setPhase] = useState("identifier");
  const [identifier, setIdentifier] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [sessionToken, setSessionToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true,
    }).start();
  }, [phase]);

  // Resend countdown
  useEffect(() => {
    if (phase !== "otp") return;
    setResendTimer(60);
    setCanResend(false);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) { setCanResend(true); clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const handleSendOTP = useCallback(async () => {
    if (!identifier.trim()) return;
    setLoading(true);
    setError("");
    try {
      const data = await forgotPassword(identifier.trim());
      setMaskedEmail(data.email);
      fadeAnim.setValue(0);
      setPhase("otp");
    } catch (err) {
      setError(err.error || "No account found");
    } finally {
      setLoading(false);
    }
  }, [identifier]);

  const handleVerifyOTP = useCallback(async () => {
    const code = otpDigits.join("");
    if (code.length < 6) return;
    setLoading(true);
    setError("");
    try {
      const data = await verifyResetOTP(identifier.trim(), code);
      setSessionToken(data.session_token);
      fadeAnim.setValue(0);
      setPhase("reset");
    } catch (err) {
      setError(err.error || "Invalid code");
    } finally {
      setLoading(false);
    }
  }, [identifier, otpDigits]);

  const handleResetPassword = useCallback(async () => {
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    setError("");
    try {
      await resetPassword(identifier.trim(), sessionToken, password, confirmPassword);
      fadeAnim.setValue(0);
      setPhase("done");
    } catch (err) {
      setError(err.error || "Reset failed");
    } finally {
      setLoading(false);
    }
  }, [identifier, sessionToken, password, confirmPassword]);

  const handleResend = useCallback(() => {
    setOtpDigits(["", "", "", "", "", ""]);
    setCanResend(false);
    setResendTimer(60);
    handleSendOTP();
  }, [handleSendOTP]);

  const goBack = () => {
    if (phase === "otp") {
      setPhase("identifier");
      setOtpDigits(["", "", "", "", "", ""]);
      setError("");
    } else {
      navigation.goBack();
    }
  };

  const allRulesPass = PASSWORD_RULES.every((r) => r.test(password));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        {phase !== "done" && (
          <View style={styles.header}>
            <Pressable onPress={goBack} hitSlop={12}>
              <Ionicons name="arrow-back" size={24} color={colors.foreground} />
            </Pressable>
          </View>
        )}

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* ─── Phase 1: Identifier ─── */}
          {phase === "identifier" && (
            <>
              <StepIcon name="key-outline" />
              <Text style={styles.title}>Forgot Password</Text>
              <Text style={styles.subtitle}>
                Enter your email or username and we'll send you a code to reset your password.
              </Text>

              <NoFillInput
                style={styles.input}
                placeholder="Email or Username"
                placeholderTextColor={colors.mutedFg}
                value={identifier}
                onChangeText={(t) => { setIdentifier(t); setError(""); }}
                autoCapitalize="none"
                autoFocus
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <CTAButton
                label="Send Code"
                onPress={handleSendOTP}
                loading={loading}
                disabled={!identifier.trim()}
              />

              <Pressable onPress={() => navigation.goBack()} style={styles.altRow}>
                <Text style={styles.altText}>Remember your password? </Text>
                <Text style={styles.altLink}>Log in</Text>
              </Pressable>
            </>
          )}

          {/* ─── Phase 2: OTP ─── */}
          {phase === "otp" && (
            <>
              <StepIcon name="mail-open-outline" />
              <Text style={styles.title}>Enter Code</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit code to{" "}
                <Text style={styles.highlight}>{maskedEmail}</Text>
              </Text>

              <OTPBoxes value={otpDigits} onChange={setOtpDigits} />

              <View style={styles.resendRow}>
                {canResend ? (
                  <Pressable onPress={handleResend}>
                    <Text style={styles.altLink}>Resend code</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.resendTimer}>Resend in {resendTimer}s</Text>
                )}
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <CTAButton
                label="Verify Code"
                onPress={handleVerifyOTP}
                loading={loading}
                disabled={otpDigits.some((d) => !d)}
              />

              <Pressable onPress={goBack} style={styles.altRow}>
                <Text style={styles.altLink}>Use a different email</Text>
              </Pressable>
            </>
          )}

          {/* ─── Phase 3: New Password ─── */}
          {phase === "reset" && (
            <>
              <StepIcon name="shield-checkmark-outline" />
              <Text style={styles.title}>New Password</Text>
              <Text style={styles.subtitle}>
                Create a strong new password for your account.
              </Text>

              <View style={styles.inputRow}>
                <NoFillInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder="New password"
                  placeholderTextColor={colors.mutedFg}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(""); }}
                  secureTextEntry={!showPassword}
                  autoFocus
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.mutedFg} />
                </Pressable>
              </View>

              <PasswordRules password={password} />

              <NoFillInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor={colors.mutedFg}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setError(""); }}
                secureTextEntry={!showPassword}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <CTAButton
                label="Reset Password"
                onPress={handleResetPassword}
                loading={loading}
                disabled={!allRulesPass || !confirmPassword}
              />
            </>
          )}

          {/* ─── Phase 4: Done ─── */}
          {phase === "done" && (
            <View style={{ paddingTop: 60 }}>
              <View style={{ alignItems: "center" }}>
                <StepIcon name="checkmark-circle-outline" />
                <Text style={styles.title}>All Set!</Text>
                <Text style={[styles.subtitle, { textAlign: "center" }]}>
                  Your password has been reset successfully. You can now log in with your new password.
                </Text>
              </View>
              <CTAButton
                label="Back to Login"
                onPress={() => navigation.navigate(ROUTES.LOGIN)}
              />
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (colors) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    content: {
      flex: 1,
      paddingHorizontal: 28,
      paddingTop: 12,
    },

    // Step icon
    stepIconWrap: { alignItems: "center", justifyContent: "center", height: 96, marginBottom: 28 },
    stepIconGlow: {
      position: "absolute", width: 96, height: 96, borderRadius: 48,
      backgroundColor: `${colors.primary}08`,
      shadowColor: colors.primary, shadowOpacity: 0.55, shadowRadius: 32, shadowOffset: { width: 0, height: 0 },
    },
    stepIconRing: {
      position: "absolute", width: 80, height: 80, borderRadius: 40,
      borderWidth: 1, borderColor: `${colors.primary}35`,
      shadowColor: colors.primary, shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 0 },
    },
    stepIconInner: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: `${colors.primary}14`, borderWidth: 1, borderColor: `${colors.primary}50`,
      alignItems: "center", justifyContent: "center",
      shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
    },

    // Typography
    title: { fontSize: 28, fontWeight: "300", color: colors.foreground, marginBottom: 10, fontFamily: fonts.serif },
    subtitle: { fontSize: 14, color: colors.mutedFg, lineHeight: 22, marginBottom: 32 },
    highlight: { color: colors.primary, fontWeight: "500" },

    // Inputs
    input: {
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
      borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16,
      fontSize: 16, color: colors.foreground, marginBottom: 12,
    },
    inputRow: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14,
      paddingHorizontal: 16, marginBottom: 12,
    },
    inputFlex: { flex: 1, backgroundColor: "transparent", borderWidth: 0, marginBottom: 0, paddingHorizontal: 0 },
    eyeBtn: { padding: 8 },

    // OTP
    otpRow: { flexDirection: "row", gap: 8, justifyContent: "center", marginBottom: 24 },
    otpBox: {
      width: 46, height: 56, borderRadius: 10,
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
      fontSize: 22, fontWeight: "600", color: colors.foreground,
    },
    otpBoxFilled: {
      borderColor: colors.primary, backgroundColor: `${colors.primary}10`,
      shadowColor: colors.primary, shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
    },
    resendRow: { alignItems: "center", marginBottom: 24 },
    resendTimer: { fontSize: 13, color: colors.mutedFg },

    // Error
    errorText: { fontSize: 13, color: colors.error, marginBottom: 16, textAlign: "center" },

    // CTA
    ctaWrap: { marginTop: 8, borderRadius: 14, overflow: "hidden" },
    cta: { paddingVertical: 18, alignItems: "center", borderRadius: 14 },
    ctaText: { fontSize: 15, fontWeight: "600", color: "#fff", letterSpacing: 0.5 },

    // Alt links
    altRow: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
    altText: { fontSize: 14, color: colors.mutedFg },
    altLink: { fontSize: 14, color: colors.primary, fontWeight: "500" },
  });
