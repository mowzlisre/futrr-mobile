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
  Dimensions,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useState, useRef, useEffect, useContext, useCallback, forwardRef, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Location from "expo-location";
import { useNavigation } from "@react-navigation/native";
import { fonts, ROUTES } from "@/constants";
import { useTheme } from "@/hooks/useTheme";
import { useTour } from "@/hooks/useTour";
import { AuthContext } from "@/context/AuthContext";
import { saveTokens } from "@/services/storage";
import { Divider } from "@/components/ui/Divider";
import {
  sendOTP,
  verifyOTP,
  checkEmail,
  checkUsername,
  completeRegistration,
  completePreboarding,
} from "@/services/onboarding";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── TextInput with autofill disabled ────────────────────────────────────────

const NoFillInput = forwardRef(function NoFillInput({ autoFocus, ...props }, forwardedRef) {
  const innerRef = useRef(null);
  const ref = forwardedRef || innerRef;

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

// ─── Country → Timezones mapping ─────────────────────────────────────────────

const COUNTRY_TIMEZONES = {
  "Afghanistan": ["Asia/Kabul"],
  "Albania": ["Europe/Tirane"],
  "Algeria": ["Africa/Algiers"],
  "Argentina": ["America/Argentina/Buenos_Aires"],
  "Australia": ["Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane", "Australia/Perth", "Australia/Adelaide", "Australia/Darwin"],
  "Austria": ["Europe/Vienna"],
  "Bangladesh": ["Asia/Dhaka"],
  "Belgium": ["Europe/Brussels"],
  "Bolivia": ["America/La_Paz"],
  "Brazil": ["America/Sao_Paulo", "America/Manaus", "America/Recife", "America/Fortaleza"],
  "Canada": ["America/Toronto", "America/Vancouver", "America/Edmonton", "America/Winnipeg", "America/Halifax", "America/St_Johns"],
  "Chile": ["America/Santiago"],
  "China": ["Asia/Shanghai"],
  "Colombia": ["America/Bogota"],
  "Croatia": ["Europe/Zagreb"],
  "Czech Republic": ["Europe/Prague"],
  "Denmark": ["Europe/Copenhagen"],
  "Ecuador": ["America/Guayaquil"],
  "Egypt": ["Africa/Cairo"],
  "Ethiopia": ["Africa/Addis_Ababa"],
  "Finland": ["Europe/Helsinki"],
  "France": ["Europe/Paris"],
  "Germany": ["Europe/Berlin"],
  "Ghana": ["Africa/Accra"],
  "Greece": ["Europe/Athens"],
  "Hungary": ["Europe/Budapest"],
  "India": ["Asia/Kolkata"],
  "Indonesia": ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"],
  "Iran": ["Asia/Tehran"],
  "Iraq": ["Asia/Baghdad"],
  "Ireland": ["Europe/Dublin"],
  "Israel": ["Asia/Jerusalem"],
  "Italy": ["Europe/Rome"],
  "Japan": ["Asia/Tokyo"],
  "Jordan": ["Asia/Amman"],
  "Kenya": ["Africa/Nairobi"],
  "Malaysia": ["Asia/Kuala_Lumpur"],
  "Mexico": ["America/Mexico_City", "America/Cancun", "America/Tijuana"],
  "Morocco": ["Africa/Casablanca"],
  "Myanmar": ["Asia/Yangon"],
  "Netherlands": ["Europe/Amsterdam"],
  "New Zealand": ["Pacific/Auckland", "Pacific/Chatham"],
  "Nigeria": ["Africa/Lagos"],
  "Norway": ["Europe/Oslo"],
  "Pakistan": ["Asia/Karachi"],
  "Peru": ["America/Lima"],
  "Philippines": ["Asia/Manila"],
  "Poland": ["Europe/Warsaw"],
  "Portugal": ["Europe/Lisbon", "Atlantic/Azores"],
  "Romania": ["Europe/Bucharest"],
  "Russia": ["Europe/Moscow", "Asia/Yekaterinburg", "Asia/Novosibirsk", "Asia/Vladivostok", "Asia/Kamchatka"],
  "Saudi Arabia": ["Asia/Riyadh"],
  "Serbia": ["Europe/Belgrade"],
  "Singapore": ["Asia/Singapore"],
  "South Africa": ["Africa/Johannesburg"],
  "South Korea": ["Asia/Seoul"],
  "Spain": ["Europe/Madrid", "Atlantic/Canary"],
  "Sri Lanka": ["Asia/Colombo"],
  "Sudan": ["Africa/Khartoum"],
  "Sweden": ["Europe/Stockholm"],
  "Switzerland": ["Europe/Zurich"],
  "Taiwan": ["Asia/Taipei"],
  "Tanzania": ["Africa/Dar_es_Salaam"],
  "Thailand": ["Asia/Bangkok"],
  "Turkey": ["Europe/Istanbul"],
  "Uganda": ["Africa/Kampala"],
  "Ukraine": ["Europe/Kyiv"],
  "United Arab Emirates": ["Asia/Dubai"],
  "United Kingdom": ["Europe/London"],
  "United States": ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu"],
  "Uzbekistan": ["Asia/Tashkent"],
  "Venezuela": ["America/Caracas"],
  "Vietnam": ["Asia/Ho_Chi_Minh"],
};

// ─── Password validation ─────────────────────────────────────────────────────

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "One number", test: (p) => /[0-9]/.test(p) },
  { label: "One special character", test: (p) => /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~;']/.test(p) },
];

const isPasswordValid = (p) => PASSWORD_RULES.every((r) => r.test(p));

const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// ─── Helper: timezone display name ──────────────────────────────────────────

function tzDisplayName(tz) {
  try {
    const now = new Date();
    // Get the UTC offset in minutes for this timezone
    const utcStr = now.toLocaleString("en-US", { timeZone: "UTC" });
    const tzStr = now.toLocaleString("en-US", { timeZone: tz });
    const diffMs = new Date(tzStr) - new Date(utcStr);
    const totalMinutes = Math.round(diffMs / 60000);
    const sign = totalMinutes >= 0 ? "+" : "-";
    const absMinutes = Math.abs(totalMinutes);
    const hours = Math.floor(absMinutes / 60);
    const minutes = absMinutes % 60;
    const offsetStr = minutes > 0 ? `GMT${sign}${hours}:${String(minutes).padStart(2, "0")}` : `GMT${sign}${hours}`;
    const city = tz.replace(/_/g, " ").split("/").pop();
    return `${city} (${offsetStr})`;
  } catch {
    return tz;
  }
}

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

// ─── Country picker modal ────────────────────────────────────────────────────

function CountryPicker({ visible, onClose, onSelect }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [query, setQuery] = useState("");
  const filtered = COUNTRIES.filter((c) =>
    c.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.pickerModal}>
        <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.background }}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Country</Text>
            <Pressable onPress={onClose} style={styles.pickerClose}>
              <Ionicons name="close" size={22} color={colors.foreground} />
            </Pressable>
          </View>
        </SafeAreaView>
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
              onPress={() => { onSelect(item); onClose(); setQuery(""); }}
            >
              <Text style={styles.pickerItemText}>{item}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedFg} />
            </Pressable>
          )}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </Modal>
  );
}

// ─── Timezone picker modal ───────────────────────────────────────────────────

function TimezonePicker({ visible, onClose, onSelect, timezones }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.pickerModal}>
        <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.background }}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Timezone</Text>
            <Pressable onPress={onClose} style={styles.pickerClose}>
              <Ionicons name="close" size={22} color={colors.foreground} />
            </Pressable>
          </View>
        </SafeAreaView>
        <FlatList
          data={timezones}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.pickerItem, pressed && { opacity: 0.7 }]}
              onPress={() => { onSelect(item); onClose(); }}
            >
              <Text style={styles.pickerItemText}>{tzDisplayName(item)}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedFg} />
            </Pressable>
          )}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </Modal>
  );
}

// ─── CTA button ──────────────────────────────────────────────────────────────

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

// ─── Password rules display ─────────────────────────────────────────────────

function PasswordRulesDisplay({ password }) {
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

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function OnboardingScreen({ route }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const startStep = route?.params?.startStep ?? 1;
  const isOAuthFlow = route?.params?.isOAuthFlow ?? false;
  const oauthProvider = route?.params?.oauthProvider ?? null;
  const { login, updateUser, user: authUser } = useContext(AuthContext);
  const navigation = useNavigation();
  const { startTour } = useTour();

  // Phase: "onboarding" | "welcome"
  const [phase, setPhase] = useState("onboarding");
  const [step, setStep] = useState(startStep);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Step 1 — Email + OTP
  const [email, setEmail] = useState("");
  const [emailValid, setEmailValid] = useState(null); // null = unchecked, true/false
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [sessionToken, setSessionToken] = useState("");

  // Step 2 — Password
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registeredUser, setRegisteredUser] = useState(null);

  // Step 3 — Name + Username
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Step 4 — Birthday
  const [dob, setDob] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Step 5 — Country + Timezone
  const [country, setCountry] = useState("");
  const [timezone, setTimezone] = useState("");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showTimezonePicker, setShowTimezonePicker] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Shared
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const TOTAL_STEPS = 5;

  // Timezones for selected country
  const availableTimezones = country ? (COUNTRY_TIMEZONES[country] || []) : [];

  // Auto-select timezone when country has only one
  useEffect(() => {
    if (availableTimezones.length === 1) {
      setTimezone(availableTimezones[0]);
    } else {
      setTimezone("");
    }
  }, [country]);

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

  const animatePhase = useCallback(
    (nextPhase) => {
      setError("");
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
        setPhase(nextPhase);
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      });
    },
    [fadeAnim]
  );

  const goNext = () => animateStep(step + 1);
  const goBack = () => {
    if (step === 1 && otpSent) {
      setOtpSent(false);
      setOtpDigits(["", "", "", "", "", ""]);
      setError("");
    } else {
      animateStep(step - 1);
    }
  };

  // ── Email validation (debounced) ──

  useEffect(() => {
    if (!email || !isValidEmail(email)) {
      setEmailValid(null);
      return;
    }
    setCheckingEmail(true);
    const timer = setTimeout(async () => {
      try {
        const data = await checkEmail(email.trim().toLowerCase());
        setEmailValid(data.available !== false);
      } catch {
        // If endpoint doesn't exist, just validate format
        setEmailValid(true);
      } finally {
        setCheckingEmail(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [email]);

  // ── Username availability check (debounced) ──

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

  // ── OTP countdown ──

  useEffect(() => {
    if (!otpSent) return;
    setResendTimer(60);
    setCanResend(false);
    const id = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { clearInterval(id); setCanResend(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [otpSent]);

  // ── OTP auto-submit ──

  useEffect(() => {
    if (otpSent && otpDigits.every((d) => d !== "") && !loading) {
      handleVerifyOTP();
    }
  }, [otpDigits]);

  // ── Handlers ──

  const handleSendOTP = async () => {
    if (!email.trim() || !isValidEmail(email)) { setError("Please enter a valid email"); return; }
    try {
      setLoading(true);
      setError("");
      await sendOTP(email.trim().toLowerCase());
      setOtpSent(true);
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

  const handlePasswordStep = () => {
    if (!isPasswordValid(password)) { setError("Password does not meet requirements"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setError("");
    goNext();
  };

  const handleNameStep = async () => {
    if (!firstName.trim()) { setError("Please enter your first name"); return; }
    if (!username.trim() || username.length < 3) { setError("Choose a username (at least 3 characters)"); return; }
    if (usernameAvailable === false) { setError("Username is not available"); return; }

    if (isOAuthFlow) { goNext(); return; }

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

  const handleCompleteOnboarding = async () => {
    if (!firstName.trim()) { setError("Please enter your name"); return; }
    if (!dob) { setError("Please select your date of birth"); return; }
    if (!country) { setError("Please select your country"); return; }
    if (!timezone && availableTimezones.length > 1) { setError("Please select your timezone"); return; }

    const dobStr = dob.toISOString().split("T")[0];
    const tz = timezone || availableTimezones[0] || Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (isOAuthFlow) {
      animatePhase("welcome");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await completePreboarding({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        date_of_birth: dobStr,
        country,
        timezone: tz,
      });
      animatePhase("welcome");
    } catch (e) {
      setError(e.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    if (isOAuthFlow) {
      login({
        email: "",
        isPreboarded: true,
        first_name: firstName.trim(),
      });
    } else if (registeredUser) {
      login({ ...registeredUser, isPreboarded: true, first_name: firstName.trim() });
    } else {
      updateUser({ isPreboarded: true, first_name: firstName.trim() });
    }
  };

  const handleDetectLocation = async () => {
    try {
      setDetectingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission required");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (place?.country) {
        const matched = COUNTRIES.find(
          (c) => c.toLowerCase() === place.country.toLowerCase()
        );
        if (matched) {
          setCountry(matched);
          // Try to match device timezone
          const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const tzList = COUNTRY_TIMEZONES[matched] || [];
          if (tzList.includes(deviceTz)) {
            setTimezone(deviceTz);
          } else if (tzList.length === 1) {
            setTimezone(tzList[0]);
          }
        } else {
          setCountry("Other");
          setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
        }
      }
    } catch {
      setError("Could not detect location");
    } finally {
      setDetectingLocation(false);
    }
  };

  const maxDOB = new Date();
  maxDOB.setFullYear(maxDOB.getFullYear() - 18);

  // ── Render: Welcome ──

  if (phase === "welcome") {
    return (
      <SafeAreaView style={styles.container}>
        <Animated.View style={[styles.welcomeContainer, { opacity: fadeAnim }]}>
          <View style={styles.welcomeIconWrap}>
            <View style={styles.stepIconGlow} />
            <View style={styles.stepIconRing} />
            <View style={styles.stepIconInner}>
              <Ionicons name="flower-outline" size={32} color={colors.primary} />
            </View>
          </View>
          <Text style={styles.welcomeTitle}>Welcome {firstName},</Text>
          <Text style={styles.welcomeSubtitle}>
            Start creating time capsules and preserve your memories.
          </Text>
          <View style={styles.welcomeActions}>
            <CTAButton label="Start a quick tour" onPress={() => { startTour(); handleFinish(); }} />
          </View>
          <Pressable onPress={handleFinish} style={styles.skipRow}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ── Render: Onboarding steps ──

  const renderStep = () => {
    switch (step) {
      // ─── Step 1: Email + OTP ───
      case 1:
        return (
          <View style={styles.stepContent}>
            <StepIcon name="mail-outline" />
            <Text style={styles.stepTitle}>Your Email Address</Text>
            <Text style={styles.stepSubtitle}>
              Your email is important, so that we will reach you when the time comes!
            </Text>

            {/* OAuth buttons */}
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

            {/* Email input */}
            <View style={styles.inputGroup}>
              <View style={styles.inputRow}>
                <NoFillInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.mutedFg}
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(""); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus={!otpSent}
                  editable={!otpSent}
                />
                <View style={styles.inputStatus}>
                  {checkingEmail ? (
                    <ActivityIndicator size="small" color={colors.mutedFg} />
                  ) : isValidEmail(email) && emailValid !== null ? (
                    <Ionicons
                      name={emailValid ? "checkmark-circle" : "close-circle"}
                      size={22}
                      color={emailValid ? colors.success : colors.error}
                    />
                  ) : null}
                </View>
              </View>
              {emailValid === false && (
                <Text style={styles.fieldNote}>This email is already registered</Text>
              )}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Before OTP sent: show Proceed */}
            {!otpSent && (
              <CTAButton
                label="Proceed"
                onPress={handleSendOTP}
                loading={loading}
                disabled={!isValidEmail(email) || emailValid === false || checkingEmail}
              />
            )}

            {/* After OTP sent: show OTP fields */}
            {otpSent && (
              <View style={styles.otpSection}>
                <Text style={styles.otpSentText}>
                  We sent a 6-digit code to{" "}
                  <Text style={styles.emailHighlight}>{email}</Text>
                </Text>
                <OTPBoxes value={otpDigits} onChange={setOtpDigits} />
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
                <Pressable onPress={goBack} style={styles.altRow}>
                  <Text style={styles.altLink}>Use a different email</Text>
                </Pressable>
              </View>
            )}

            {!otpSent && (
              <Pressable onPress={() => navigation.navigate(ROUTES.LOGIN)} style={styles.altRow}>
                <Text style={styles.altText}>Already have an account? </Text>
                <Text style={styles.altLink}>Log in</Text>
              </Pressable>
            )}
          </View>
        );

      // ─── Step 2: Password ───
      case 2:
        return (
          <View style={styles.stepContent}>
            <StepIcon name="shield-checkmark-outline" />
            <Text style={styles.stepTitle}>Let's secure you first!</Text>
            <Text style={styles.stepSubtitle}>
              Before we continue, choose a strong password!
            </Text>

            <View style={styles.inputGroup}>
              <View style={styles.inputRow}>
                <NoFillInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder="Password"
                  placeholderTextColor={colors.mutedFg}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(""); }}
                  secureTextEntry={!showPassword}
                  autoFocus
                />
                <Pressable style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.mutedFg} />
                </Pressable>
              </View>

              <PasswordRulesDisplay password={password} />

              <View style={[styles.inputRow, { marginTop: 4 }]}>
                <NoFillInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder="Re-enter password"
                  placeholderTextColor={colors.mutedFg}
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); setError(""); }}
                  secureTextEntry={!showConfirmPassword}
                />
                <Pressable style={styles.eyeBtn} onPress={() => setShowConfirmPassword((v) => !v)}>
                  <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.mutedFg} />
                </Pressable>
              </View>
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <Text style={[styles.fieldNote, { color: colors.error }]}>Passwords do not match</Text>
              )}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <CTAButton
              label="Proceed"
              onPress={handlePasswordStep}
              loading={loading}
              disabled={!isPasswordValid(password) || password !== confirmPassword}
            />
          </View>
        );

      // ─── Step 3: Name + Username ───
      case 3:
        return (
          <View style={styles.stepContent}>
            <StepIcon name="person-outline" />
            <Text style={styles.stepTitle}>What should we call you?</Text>
            <Text style={styles.stepSubtitle}>
              Let's get introduced first!
            </Text>

            <View style={styles.inputGroup}>
              <NoFillInput
                style={styles.input}
                placeholder="First name"
                placeholderTextColor={colors.mutedFg}
                value={firstName}
                onChangeText={(t) => { setFirstName(t); setError(""); }}
                autoFocus
              />
              <NoFillInput
                style={styles.input}
                placeholder="Last name (optional)"
                placeholderTextColor={colors.mutedFg}
                value={lastName}
                onChangeText={setLastName}
              />
              <View style={styles.inputRow}>
                <NoFillInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder="Username"
                  placeholderTextColor={colors.mutedFg}
                  value={username}
                  onChangeText={(t) => { setUsername(t.toLowerCase().replace(/\s/g, "")); setError(""); }}
                  autoCapitalize="none"
                />
                <View style={styles.inputStatus}>
                  {checkingUsername ? (
                    <ActivityIndicator size="small" color={colors.mutedFg} />
                  ) : username.length >= 3 && usernameAvailable !== null ? (
                    <Ionicons
                      name={usernameAvailable ? "checkmark-circle" : "close-circle"}
                      size={22}
                      color={usernameAvailable ? colors.success : colors.error}
                    />
                  ) : null}
                </View>
              </View>
              {usernameAvailable === false && username.length >= 3 && (
                <Text style={[styles.fieldNote, { color: colors.error }]}>Username not available</Text>
              )}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <CTAButton
              label="Proceed"
              onPress={handleNameStep}
              loading={loading}
              disabled={!firstName.trim() || !username.trim() || username.length < 3 || usernameAvailable === false || checkingUsername}
            />
          </View>
        );

      // ─── Step 4: Birthday ───
      case 4:
        return (
          <View style={styles.stepContent}>
            <StepIcon name="gift-outline" />
            <Text style={styles.stepTitle}>When do we celebrate you?</Text>
            <Text style={styles.stepSubtitle}>
              Your birthday matters to us just as much as it does to your loved ones, don't be shy, tell us!
            </Text>

            <View style={styles.inputGroup}>
              <Pressable
                style={[styles.input, styles.pickerRow]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[styles.pickerRowText, !dob && { color: colors.mutedFg }]}>
                  {dob
                    ? dob.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                    : "Select your birthday"}
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
                themeVariant={isDark ? "dark" : "light"}
                onChange={(_, selected) => {
                  setShowDatePicker(Platform.OS === "ios");
                  if (selected) setDob(selected);
                }}
              />
            )}

            <Pressable onPress={() => Linking.openURL("https://futrr.app/faq")} style={styles.faqRow}>
              <Ionicons name="help-circle-outline" size={16} color={colors.primary} />
              <Text style={styles.faqText}>Why do we collect this?</Text>
            </Pressable>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <CTAButton
              label="Proceed"
              onPress={() => {
                if (!dob) { setError("Please select your date of birth"); return; }
                const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
                if (age < 18) { setError("You must be at least 18 years old"); return; }
                setError("");
                goNext();
              }}
              disabled={!dob}
            />
          </View>
        );

      // ─── Step 5: Country + Timezone ───
      case 5:
        return (
          <View style={styles.stepContent}>
            <StepIcon name="earth-outline" />
            <Text style={styles.stepTitle}>Where are you based?</Text>
            <Text style={styles.stepSubtitle}>
              Help us get your timing right.
            </Text>

            <View style={styles.inputGroup}>
              {/* Country */}
              <Pressable
                style={[styles.input, styles.pickerRow]}
                onPress={() => setShowCountryPicker(true)}
              >
                <Text style={[styles.pickerRowText, !country && { color: colors.mutedFg }]}>
                  {country || "Select your country"}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.mutedFg} />
              </Pressable>

              {/* Timezone — shows after country is selected */}
              {country && availableTimezones.length > 1 && (
                <Pressable
                  style={[styles.input, styles.pickerRow]}
                  onPress={() => setShowTimezonePicker(true)}
                >
                  <Text style={[styles.pickerRowText, !timezone && { color: colors.mutedFg }]}>
                    {timezone ? tzDisplayName(timezone) : "Select your timezone"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.mutedFg} />
                </Pressable>
              )}

              {/* Single timezone display */}
              {country && availableTimezones.length === 1 && (
                <View style={styles.tzRow}>
                  <Ionicons name="time-outline" size={14} color={colors.mutedFg} />
                  <Text style={styles.tzText}>Timezone: {tzDisplayName(availableTimezones[0])}</Text>
                </View>
              )}

              {/* Detect location */}
              <Pressable
                onPress={handleDetectLocation}
                disabled={detectingLocation}
                style={({ pressed }) => [styles.detectBtn, pressed && { opacity: 0.7 }]}
              >
                {detectingLocation ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="locate-outline" size={18} color={colors.primary} />
                )}
                <Text style={styles.detectBtnText}>Detect my location</Text>
              </Pressable>
            </View>

            <Pressable onPress={() => Linking.openURL("https://futrr.app/faq")} style={styles.faqRow}>
              <Ionicons name="help-circle-outline" size={16} color={colors.primary} />
              <Text style={styles.faqText}>Why do we collect this?</Text>
            </Pressable>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <CountryPicker
              visible={showCountryPicker}
              onClose={() => setShowCountryPicker(false)}
              onSelect={(c) => { setCountry(c); setError(""); }}
            />
            <TimezonePicker
              visible={showTimezonePicker}
              onClose={() => setShowTimezonePicker(false)}
              onSelect={(tz) => { setTimezone(tz); setError(""); }}
              timezones={availableTimezones}
            />

            <CTAButton
              label="Proceed"
              onPress={handleCompleteOnboarding}
              loading={loading}
              disabled={!country || (availableTimezones.length > 1 && !timezone)}
            />
          </View>
        );

      default:
        return null;
    }
  };

  const canGoBack = step > startStep || (step === 1 && otpSent);

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

// ─── Styles ──────────────────────────────────────────────────────────────────

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
  inputStatus: {
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
  otpSection: {
    marginTop: 8,
  },
  otpSentText: {
    fontSize: 14,
    color: colors.mutedFg,
    lineHeight: 22,
    marginBottom: 20,
    textAlign: "center",
  },
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

  // ── Date / picker rows ──
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
    marginBottom: 12,
  },
  tzText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedFg,
  },

  // ── Detect location ──
  detectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
    backgroundColor: `${colors.primary}08`,
  },
  detectBtnText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "500",
  },

  // ── FAQ link ──
  faqRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
  },
  faqText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "400",
  },

  // ── Error ──
  errorText: {
    fontSize: 13,
    color: colors.error,
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

  // ── OAuth ──
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

  // ── Alt links ──
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

  // ── Country/Timezone picker modal ──
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

  // ── Welcome screen ──
  welcomeContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  welcomeIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    height: 96,
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: "300",
    color: colors.foreground,
    marginBottom: 12,
    fontFamily: fonts.serif,
    textAlign: "center",
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: colors.mutedFg,
    lineHeight: 24,
    marginBottom: 40,
    fontFamily: fonts.serif,
    textAlign: "center",
  },
  welcomeActions: {
    alignSelf: "stretch",
  },
  skipRow: {
    alignItems: "center",
    marginTop: 20,
  },
  skipText: {
    fontSize: 15,
    color: colors.mutedFg,
    fontWeight: "500",
  },

});
