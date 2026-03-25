import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Switch,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useState, useRef, useEffect, useContext, useCallback, forwardRef, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import { fonts, ROUTES } from "@/constants";
import { useTheme } from "@/hooks/useTheme";
import { AuthContext } from "@/context/AuthContext";
import { saveTokens } from "@/services/storage";
import { Divider } from "@/components/ui/Divider";
import {
  sendOTP,
  verifyOTP,
  checkUsername,
  completeRegistration,
  completePreboarding,
} from "@/services/onboarding";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── TextInput with autofill disabled (prevents iOS yellow tint) ──────────────
// Uses delayed focus instead of the native autoFocus prop so iOS autofill
// doesn't activate at mount time (which is what causes the yellow highlight).

const NoFillInput = forwardRef(function NoFillInput({ autoFocus, ...props }, forwardedRef) {
  const innerRef = useRef(null);
  const ref = forwardedRef || innerRef;

  useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => ref?.current?.focus(), 150);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TextInput
      ref={ref}
      textContentType="none"
      autoComplete="off"
      autoCorrect={false}
      spellCheck={false}
      {...props}
      style={[props.style, { overflow: 'hidden' }]}
    />
  );
});

// ─── Countries ───────────────────────────────────────────────────────────────

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria",
  "Bangladesh", "Belgium", "Bolivia", "Brazil", "Canada", "Chile", "China",
  "Colombia", "Croatia", "Czech Republic", "Denmark", "Ecuador", "Egypt",
  "Ethiopia", "Finland", "France", "Germany", "Ghana", "Greece", "Hungary",
  "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Japan", "Jordan", "Kenya", "Malaysia", "Mexico", "Morocco", "Myanmar",
  "Netherlands", "New Zealand", "Nigeria", "Norway", "Pakistan", "Peru",
  "Philippines", "Poland", "Portugal", "Romania", "Russia", "Saudi Arabia",
  "Serbia", "Singapore", "South Africa", "South Korea", "Spain", "Sri Lanka",
  "Sudan", "Sweden", "Switzerland", "Taiwan", "Tanzania", "Thailand",
  "Turkey", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom",
  "United States", "Uzbekistan", "Venezuela", "Vietnam", "Other",
].sort();

// ─── Progress dots ───────────────────────────────────────────────────────────

function ProgressDots({ step, total }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < step - 1 ? styles.dotDone : i === step - 1 ? styles.dotCurrent : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

// ─── Step icon with glow ─────────────────────────────────────────────────────

function StepIcon({ name }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.stepIconWrap}>
      <View style={styles.stepIconGlow} />
      <View style={styles.stepIconRing} />
      <View style={styles.stepIconInner}>
        <Ionicons name={name} size={28} color={colors.primary} />
      </View>
    </View>
  );
}

// ─── OTP boxes ───────────────────────────────────────────────────────────────

function OTPBoxes({ value, onChange }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const r0 = useRef(null);
  const r1 = useRef(null);
  const r2 = useRef(null);
  const r3 = useRef(null);
  const r4 = useRef(null);
  const r5 = useRef(null);
  const refs = [r0, r1, r2, r3, r4, r5];

  const handleChange = (text, index) => {
    const digit = text.replace(/[^0-9]/g, "").slice(-1);
    const next = [...value];
    next[index] = digit;
    onChange(next);
    if (digit && index < 5) refs[index + 1].current?.focus();
  };

  const handleKey = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && !value[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
  };

  return (
    <View style={styles.otpRow}>
      {value.map((digit, i) => (
        <NoFillInput
          key={i}
          ref={refs[i]}
          style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
          value={digit}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={(e) => handleKey(e, i)}
          keyboardType="number-pad"
          maxLength={1}
          textAlign="center"
          caretHidden
          selectionColor={colors.primary}
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
        />
      ))}
    </View>
  );
}

// ─── Country picker ───────────────────────────────────────────────────────────

function CountryPicker({ visible, onClose, onSelect }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [query, setQuery] = useState("");
  const filtered = COUNTRIES.filter((c) =>
    c.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.pickerModal}>
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerTitle}>Select Country</Text>
          <Pressable onPress={onClose} style={styles.pickerClose}>
            <Ionicons name="close" size={22} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={styles.pickerSearch}>
          <Ionicons name="search-outline" size={16} color={colors.mutedFg} style={{ marginRight: 8 }} />
          <NoFillInput
            style={styles.pickerSearchInput}
            placeholder="Search country..."
            placeholderTextColor={colors.mutedFg}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.pickerItem, pressed && { opacity: 0.7 }]}
              onPress={() => { onSelect(item); onClose(); }}
            >
              <Text style={styles.pickerItemText}>{item}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedFg} />
            </Pressable>
          )}
          keyboardShouldPersistTaps="handled"
        />
      </SafeAreaView>
    </Modal>
  );
}

// ─── CTA button ───────────────────────────────────────────────────────────────

function CTAButton({ label, onPress, loading, disabled }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.ctaWrap,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.85 },
      ]}
    >
      <LinearGradient
        colors={[colors.primary, "#D4924A", colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cta}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.ctaText}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function OnboardingScreen({ route }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const startStep = route?.params?.startStep ?? 1;
  const isOAuthFlow = route?.params?.isOAuthFlow ?? false;
  const oauthProvider = route?.params?.oauthProvider ?? null;
  const { login, updateUser, user: authUser } = useContext(AuthContext);
  const navigation = useNavigation();

  const [step, setStep] = useState(startStep);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Step 1
  const [email, setEmail] = useState("");

  // Step 2
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Step 3
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [sessionToken, setSessionToken] = useState("");
  const [registeredUser, setRegisteredUser] = useState(null);

  // Step 4
  const [firstName, setFirstName] = useState("");
  const [dob, setDob] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Step 5
  const [country, setCountry] = useState("");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Step 6
  const [notificationPush, setNotificationPush] = useState(true);

  // Shared
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Step animation ──
  const animateStep = useCallback(
    (nextStep) => {
      setError("");
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 130, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -20, duration: 130, useNativeDriver: true }),
      ]).start(() => {
        setStep(nextStep);
        slideAnim.setValue(20);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();
      });
    },
    [fadeAnim, slideAnim]
  );

  const goNext = () => animateStep(step + 1);
  const goBack = () => animateStep(step - 1);

  // ── OTP countdown ──
  useEffect(() => {
    if (step !== 2) return;
    setResendTimer(60);
    setCanResend(false);
    const id = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { clearInterval(id); setCanResend(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  // ── Username availability check ──
  useEffect(() => {
    if (!username || username.length < 3) { setUsernameAvailable(null); return; }
    setCheckingUsername(true);
    const timer = setTimeout(async () => {
      try {
        const data = await checkUsername(username);
        setUsernameAvailable(data.available);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  // ── Handlers ──

  const handleSendOTP = async () => {
    if (!email.trim()) { setError("Please enter your email"); return; }
    try {
      setLoading(true);
      setError("");
      await sendOTP(email.trim().toLowerCase());
      goNext();
    } catch (e) {
      setError(e.error || "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const code = otpDigits.join("");
    if (code.length < 6) { setError("Enter all 6 digits"); return; }
    try {
      setLoading(true);
      setError("");
      const data = await verifyOTP(email.trim().toLowerCase(), code);
      setSessionToken(data.session_token);
      goNext();
    } catch (e) {
      setError(e.error || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  // ── OTP auto-submit when all 6 digits filled ──
  useEffect(() => {
    if (step === 2 && otpDigits.every((d) => d !== "") && !loading) {
      handleVerifyOTP();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpDigits]);

  const handleRegister = async () => {
    if (!username.trim()) { setError("Choose a username"); return; }
    if (usernameAvailable === false) { setError("Username is not available"); return; }

    // OAuth flow — no password or backend call needed yet
    if (isOAuthFlow) {
      goNext();
      return;
    }

    if (!password || password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    try {
      setLoading(true);
      setError("");
      const data = await completeRegistration(
        email.trim().toLowerCase(), sessionToken, username.trim(), password
      );
      await saveTokens(data.tokens.access, data.tokens.refresh);
      setRegisteredUser(data.user);
      goNext();
    } catch (e) {
      setError(e.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCompletePreboarding = async () => {
    if (!firstName.trim()) { setError("Please enter your name"); return; }
    if (!dob) { setError("Please select your date of birth"); return; }
    if (!country) { setError("Please select your country"); return; }

    // OAuth flow — backend not wired yet, mock login directly
    if (isOAuthFlow) {
      login({
        username: username.trim(),
        email: "",
        isPreboarded: true,
        first_name: firstName.trim(),
      });
      return;
    }

    const dobStr = dob.toISOString().split("T")[0];
    try {
      setLoading(true);
      setError("");
      await completePreboarding({
        first_name: firstName.trim(),
        date_of_birth: dobStr,
        country,
        timezone: detectedTimezone,
        notification_push: notificationPush,
      });
      if (registeredUser) {
        login({ ...registeredUser, isPreboarded: true, first_name: firstName.trim() });
      } else {
        updateUser({ isPreboarded: true, first_name: firstName.trim() });
      }
    } catch (e) {
      setError(e.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleUseAnotherEmail = () => {
    setOtpDigits(["", "", "", "", "", ""]);
    setError("");
    animateStep(1);
  };

  const maxDOB = new Date();
  maxDOB.setFullYear(maxDOB.getFullYear() - 18);

  // ── Steps ──

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <StepIcon name="mail-outline" />
            <Text style={styles.stepTitle}>What's your email?</Text>
            <Text style={styles.stepSubtitle}>
              Your email is at the heart of Futrr — it's how your capsules find their way home.
            </Text>

            {/* ── OAuth buttons ── */}
            <Pressable
              style={({ pressed }) => [styles.oauthBtn, pressed && { opacity: 0.75 }]}
              onPress={() => navigation.navigate(ROUTES.ONBOARDING, { startStep: 3, isOAuthFlow: true, oauthProvider: "apple" })}
            >
              <Ionicons name="logo-apple" size={20} color={colors.foreground} />
              <Text style={styles.oauthBtnText}>Continue with Apple</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.oauthBtn, { marginTop: 10 }, pressed && { opacity: 0.75 }]}
              onPress={() => navigation.navigate(ROUTES.ONBOARDING, { startStep: 3, isOAuthFlow: true, oauthProvider: "google" })}
            >
              <Ionicons name="logo-google" size={18} color={colors.foreground} />
              <Text style={styles.oauthBtnText}>Continue with Google</Text>
            </Pressable>

            <Divider />

            <View style={styles.inputGroup}>
              <NoFillInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.mutedFg}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(""); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
              />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <CTAButton
              label="Send Verification Code"
              onPress={handleSendOTP}
              loading={loading}
              disabled={!email.trim()}
            />
            <Pressable onPress={() => navigation.navigate(ROUTES.LOGIN)} style={styles.altRow}>
              <Text style={styles.altText}>Already have an account? </Text>
              <Text style={styles.altLink}>Log in</Text>
            </Pressable>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <StepIcon name="shield-checkmark-outline" />
            <Text style={styles.stepTitle}>Check your inbox</Text>
            <Text style={styles.stepSubtitle}>
              We sent a 6-digit code to{"\n"}
              <Text style={styles.emailHighlight}>{email}</Text>
            </Text>
            <OTPBoxes value={otpDigits} onChange={setOtpDigits} />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.resendRow}>
              {canResend ? (
                <Pressable onPress={() => { setOtpDigits(["", "", "", "", "", ""]); handleSendOTP(); }}>
                  <Text style={styles.altLink}>Resend code</Text>
                </Pressable>
              ) : (
                <Text style={styles.resendTimer}>Resend in {resendTimer}s</Text>
              )}
            </View>
            <CTAButton
              label="Verify Code"
              onPress={handleVerifyOTP}
              loading={loading}
              disabled={otpDigits.some((d) => !d)}
            />
            <Pressable onPress={handleUseAnotherEmail} style={styles.altRow}>
              <Text style={styles.altLink}>Use a different email</Text>
            </Pressable>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <StepIcon name={isOAuthFlow ? (oauthProvider === "apple" ? "logo-apple" : "logo-google") : "key-outline"} />
            <Text style={styles.stepTitle}>Pick your username</Text>
            <Text style={styles.stepSubtitle}>
              {isOAuthFlow
                ? `You're signing in with ${oauthProvider === "apple" ? "Apple" : "Google"}. Choose a unique username for Futrr.`
                : "Choose a unique username and a secure password."}
            </Text>
            <View style={styles.inputGroup}>
              {/* Username row */}
              <View style={styles.inputRow}>
                <NoFillInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder="username"
                  placeholderTextColor={colors.mutedFg}
                  value={username}
                  onChangeText={(t) => { setUsername(t.toLowerCase().replace(/\s/g, "")); setError(""); }}
                  autoCapitalize="none"
                />
                <View style={styles.usernameStatus}>
                  {checkingUsername ? (
                    <ActivityIndicator size="small" color={colors.mutedFg} />
                  ) : username.length >= 3 && usernameAvailable !== null ? (
                    <Ionicons
                      name={usernameAvailable ? "checkmark-circle" : "close-circle"}
                      size={22}
                      color={usernameAvailable ? "#4CAF50" : "#f44336"}
                    />
                  ) : null}
                </View>
              </View>
              {usernameAvailable === false && username.length >= 3 && (
                <Text style={styles.fieldNote}>Username not available</Text>
              )}

              {/* Password fields — hidden for OAuth */}
              {!isOAuthFlow && (
                <>
                  <View style={[styles.inputRow, { marginTop: 12 }]}>
                    <NoFillInput
                      style={[styles.input, styles.inputFlex]}
                      placeholder="Password (min. 8 characters)"
                      placeholderTextColor={colors.mutedFg}
                      value={password}
                      onChangeText={(t) => { setPassword(t); setError(""); }}
                      secureTextEntry={!showPassword}
                      textContentType="newPassword"
                      autoComplete="new-password"
                    />
                    <Pressable style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={colors.mutedFg}
                      />
                    </Pressable>
                  </View>

                  <View style={[styles.inputRow, { marginTop: 12 }]}>
                    <NoFillInput
                      style={[styles.input, styles.inputFlex]}
                      placeholder="Re-enter password"
                      placeholderTextColor={colors.mutedFg}
                      value={confirmPassword}
                      onChangeText={(t) => { setConfirmPassword(t); setError(""); }}
                      secureTextEntry={!showConfirmPassword}
                      textContentType="newPassword"
                      autoComplete="new-password"
                    />
                    <Pressable style={styles.eyeBtn} onPress={() => setShowConfirmPassword((v) => !v)}>
                      <Ionicons
                        name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={colors.mutedFg}
                      />
                    </Pressable>
                  </View>
                  {confirmPassword.length > 0 && password !== confirmPassword && (
                    <Text style={styles.fieldNote}>Passwords do not match</Text>
                  )}
                </>
              )}
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <CTAButton
              label={isOAuthFlow ? "Continue" : "Create Account"}
              onPress={handleRegister}
              loading={loading}
              disabled={
                !username ||
                usernameAvailable === false ||
                (!isOAuthFlow && (!password || !confirmPassword))
              }
            />
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <StepIcon name="person-outline" />
            <Text style={styles.stepTitle}>Tell us about you</Text>
            <Text style={styles.stepSubtitle}>Your name and age help us personalise your experience.</Text>
            <View style={styles.inputGroup}>
              <NoFillInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={colors.mutedFg}
                value={firstName}
                onChangeText={(t) => { setFirstName(t); setError(""); }}
                autoFocus
              />
              <Pressable
                style={[styles.input, styles.pickerRow]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[styles.pickerRowText, !dob && { color: colors.mutedFg }]}>
                  {dob
                    ? dob.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                    : "Date of birth"}
                </Text>
                <Ionicons name="calendar-outline" size={18} color={colors.mutedFg} />
              </Pressable>
              <Text style={styles.fieldNote}>You must be 18 or older to use Futrr.</Text>
            </View>
            {showDatePicker && (
              <DateTimePicker
                value={dob || maxDOB}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                maximumDate={maxDOB}
                minimumDate={new Date(1900, 0, 1)}
                onChange={(_, selected) => {
                  setShowDatePicker(Platform.OS === "ios");
                  if (selected) setDob(selected);
                }}
              />
            )}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <CTAButton
              label="Continue"
              onPress={() => {
                if (!firstName.trim()) { setError("Please enter your name"); return; }
                if (!dob) { setError("Please select your date of birth"); return; }
                const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
                if (age < 18) { setError("You must be at least 18 years old"); return; }
                setError("");
                goNext();
              }}
              disabled={!firstName.trim() || !dob}
            />
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContent}>
            <StepIcon name="earth-outline" />
            <Text style={styles.stepTitle}>Where are you based?</Text>
            <Text style={styles.stepSubtitle}>This helps us with time zones and local features.</Text>
            <View style={styles.inputGroup}>
              <Pressable
                style={[styles.input, styles.pickerRow]}
                onPress={() => setShowCountryPicker(true)}
              >
                <Text style={[styles.pickerRowText, !country && { color: colors.mutedFg }]}>
                  {country || "Select your country"}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.mutedFg} />
              </Pressable>
              {detectedTimezone ? (
                <View style={styles.tzRow}>
                  <Ionicons name="time-outline" size={14} color={colors.mutedFg} />
                  <Text style={styles.tzText}>Timezone: {detectedTimezone}</Text>
                </View>
              ) : null}
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <CountryPicker
              visible={showCountryPicker}
              onClose={() => setShowCountryPicker(false)}
              onSelect={(c) => { setCountry(c); setError(""); }}
            />
            <CTAButton label="Continue" onPress={goNext} disabled={!country} />
          </View>
        );

      case 6:
        return (
          <View style={styles.stepContent}>
            <StepIcon name="notifications-outline" />
            <Text style={styles.stepTitle}>Stay in the loop</Text>
            <Text style={styles.stepSubtitle}>
              Get notified when your capsules unlock, when someone adds you to theirs, or when it's time to reflect.
            </Text>
            <View style={styles.notifCard}>
              <View style={styles.notifRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifLabel}>Push notifications</Text>
                  <Text style={styles.notifDesc}>Capsule unlocks, mentions, and updates</Text>
                </View>
                <Switch
                  value={notificationPush}
                  onValueChange={setNotificationPush}
                  trackColor={{ false: colors.border, true: `${colors.primary}60` }}
                  thumbColor={notificationPush ? colors.primary : colors.mutedFg}
                />
              </View>
            </View>
            <Text style={styles.notifNote}>You can change this at any time in Settings.</Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <CTAButton label="Finish" onPress={handleCompletePreboarding} loading={loading} />
          </View>
        );

      default:
        return null;
    }
  };

  const TOTAL_STEPS = 6;
  // Back button only on registration steps (1–3), not on preboarding steps (4–6)
  const canGoBack = step > startStep && step < 4;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {canGoBack ? (
          <Pressable onPress={goBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </Pressable>
        ) : (
          <View style={styles.backBtn} />
        )}
        <ProgressDots step={step} total={TOTAL_STEPS} />
        <View style={styles.backBtn} />
      </View>

      <Text style={styles.stepLabel}>Step {step} of {TOTAL_STEPS}</Text>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.animatedContent,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {renderStep()}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotInactive: {
    width: 6,
    backgroundColor: colors.border,
  },
  dotCurrent: {
    width: 22,
    backgroundColor: colors.primary,
  },
  dotDone: {
    width: 6,
    backgroundColor: `${colors.primary}55`,
  },
  stepLabel: {
    textAlign: "center",
    fontSize: 11,
    lineHeight: 16,
    color: colors.mutedFg,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  animatedContent: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 40,
  },

  // ── Step icon ──
  stepIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    height: 96,
    marginBottom: 28,
  },
  stepIconGlow: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.primary}08`,
    shadowColor: colors.primary,
    shadowOpacity: 0.55,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 0 },
  },
  stepIconRing: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: `${colors.primary}35`,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  stepIconInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.primary}14`,
    borderWidth: 1,
    borderColor: `${colors.primary}50`,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },

  // ── Typography ──
  stepTitle: {
    fontSize: 28,
    fontWeight: "300",
    color: colors.foreground,
    marginBottom: 10,
    fontFamily: fonts.serif,
  },
  stepSubtitle: {
    fontSize: 14,
    color: colors.mutedFg,
    lineHeight: 22,
    marginBottom: 32,
  },
  emailHighlight: {
    color: colors.primary,
    fontWeight: "500",
  },

  // ── Inputs ──
  inputGroup: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.foreground,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  inputFlex: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 0,
    marginBottom: 0,
    paddingHorizontal: 0,
  },
  usernameStatus: {
    width: 32,
    alignItems: "center",
  },
  eyeBtn: {
    padding: 8,
  },
  fieldNote: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedFg,
    marginTop: 4,
    marginLeft: 2,
  },

  // ── OTP ──
  otpRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginBottom: 24,
  },
  otpBox: {
    width: 46,
    height: 56,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 22,
    fontWeight: "600",
    color: colors.foreground,
  },
  otpBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  resendRow: {
    alignItems: "center",
    marginBottom: 24,
  },
  resendTimer: {
    fontSize: 13,
    color: colors.mutedFg,
  },

  // ── Date / country picker rows ──
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerRowText: {
    fontSize: 16,
    color: colors.foreground,
  },

  // ── Timezone ──
  tzRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    marginLeft: 2,
  },
  tzText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedFg,
  },

  // ── Notifications ──
  notifCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  notifLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.foreground,
    marginBottom: 3,
  },
  notifDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedFg,
  },
  notifNote: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedFg,
    marginBottom: 32,
    marginLeft: 2,
  },

  // ── Error ──
  errorText: {
    fontSize: 13,
    color: "#f44336",
    marginBottom: 16,
    textAlign: "center",
  },

  // ── CTA ──
  ctaWrap: {
    marginTop: 8,
    borderRadius: 14,
    overflow: "hidden",
  },
  cta: {
    paddingVertical: 18,
    alignItems: "center",
    borderRadius: 14,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: 0.5,
  },

  // ── OAuth social buttons ──
  oauthBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 15,
    backgroundColor: colors.card,
  },
  oauthBtnText: {
    fontSize: 15,
    color: colors.foreground,
    fontWeight: "400",
    letterSpacing: 0.2,
  },

  // ── Alt links (login / use another email) ──
  altRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  altText: {
    fontSize: 14,
    color: colors.mutedFg,
  },
  altLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "500",
  },

  // ── Country picker modal ──
  pickerModal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.foreground,
  },
  pickerClose: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerSearch: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    margin: 16,
  },
  pickerSearchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.foreground,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerItemText: {
    fontSize: 15,
    color: colors.foreground,
  },
});
