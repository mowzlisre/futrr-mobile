import { View, Text, TextInput, Pressable, StyleSheet, Animated, Easing } from "react-native";
import { useState, useRef, useEffect } from "react";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {colors} from "../conf";

// ─── Particles ────────────────────────────────────────────────────────────────
const PARTICLES = [
  { id: 0,  x: "18%", y: "8%",  size: 180, color: "rgba(234,166,70,0.22)",  dur: 7800, delay: 0,    driftX: 18,  driftY: 22  },
  { id: 1,  x: "68%", y: "14%", size: 140, color: "rgba(196,113,74,0.18)",  dur: 9200, delay: 1100, driftX: -14, driftY: 18  },
  { id: 2,  x: "42%", y: "55%", size: 200, color: "rgba(234,166,70,0.14)",  dur: 8500, delay: 400,  driftX: 10,  driftY: -16 },
  { id: 3,  x: "80%", y: "60%", size: 130, color: "rgba(212,165,116,0.20)", dur: 7000, delay: 2200, driftX: -20, driftY: 12  },
  { id: 4,  x: "5%",  y: "70%", size: 160, color: "rgba(196,113,74,0.15)",  dur: 9800, delay: 600,  driftX: 16,  driftY: -10 },
  { id: 5,  x: "55%", y: "28%", size: 80,  color: "rgba(234,166,70,0.30)",  dur: 5500, delay: 800,  driftX: -10, driftY: 14  },
  { id: 6,  x: "25%", y: "38%", size: 65,  color: "rgba(212,165,116,0.28)", dur: 6200, delay: 1800, driftX: 12,  driftY: -18 },
  { id: 7,  x: "75%", y: "42%", size: 90,  color: "rgba(234,166,70,0.22)",  dur: 7400, delay: 300,  driftX: -8,  driftY: 20  },
  { id: 8,  x: "88%", y: "22%", size: 55,  color: "rgba(196,113,74,0.32)",  dur: 5000, delay: 2600, driftX: -14, driftY: -12 },
  { id: 9,  x: "12%", y: "48%", size: 70,  color: "rgba(234,166,70,0.25)",  dur: 6800, delay: 1400, driftX: 18,  driftY: 10  },
  { id: 10, x: "62%", y: "78%", size: 30,  color: "rgba(234,166,70,0.55)",  dur: 4200, delay: 500,  driftX: -6,  driftY: -8  },
  { id: 11, x: "33%", y: "85%", size: 22,  color: "rgba(212,165,116,0.50)", dur: 3800, delay: 1600, driftX: 8,   driftY: -6  },
  { id: 12, x: "50%", y: "12%", size: 18,  color: "rgba(234,166,70,0.60)",  dur: 4600, delay: 900,  driftX: -4,  driftY: 10  },
  { id: 13, x: "90%", y: "80%", size: 26,  color: "rgba(196,113,74,0.45)",  dur: 5200, delay: 2000, driftX: -10, driftY: -4  },
  { id: 14, x: "8%",  y: "22%", size: 20,  color: "rgba(234,166,70,0.55)",  dur: 3600, delay: 700,  driftX: 6,   driftY: 8   },
];

function Particle({ x, y, size, color, dur, delay, driftX, driftY }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(0.15)).current;
  const scale      = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(translateX, { toValue: driftX, duration: dur,       delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(translateY, { toValue: driftY, duration: dur,       delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(opacity,    { toValue: 0.85,   duration: dur * 0.5, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(scale,      { toValue: 1.12,   duration: dur * 0.7, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(translateX, { toValue: 0,    duration: dur,       easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 0,    duration: dur,       easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(opacity,    { toValue: 0.15, duration: dur * 0.5, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(scale,      { toValue: 0.85, duration: dur * 0.7, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: x, top: y,
        width: size, height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    />
  );
}

function ParticleField() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {PARTICLES.map(p => <Particle key={p.id} {...p} />)}
      <BlurView intensity={82} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
    </View>
  );
}

function FutrrInput({ placeholder, value, onChangeText, secureTextEntry = false }) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: focused ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [focused]);

  const borderColor   = borderAnim.interpolate({ inputRange: [0, 1], outputRange: ["rgba(255,255,255,0.08)", "rgba(234,166,70,0.5)"] });
  const shadowOpacity = borderAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] });

  return (
    <Animated.View style={[styles.inputWrapper, { borderColor, shadowColor: colors.primary, shadowOpacity, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } }]}>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.mutedFg}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </Animated.View>
  );
}

function Divider() {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>or</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");

  const fadeIn  = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(32)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 900, delay: 100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 900, delay: 100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>

      <LinearGradient colors={["#0A0A0F", "#0E0E18", "#0A0A0F"]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

      <ParticleField />

      <Animated.View style={[styles.centerWrapper, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>

        {/* Brand */}
        <View style={styles.brandBlock}>
          <Text style={styles.logo}>futrr</Text>
          <Text style={styles.tagline}>Leave something worth waiting for.</Text>
        </View>

        {/* Form */}
        <View style={styles.inputsBlock}>
          <FutrrInput placeholder="Email, Username, or Phone" value={email} onChangeText={setEmail} />
          <FutrrInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        </View>

        <Text style={styles.forgotPassword}>Forgot password?</Text>

        <Pressable
          style={({ pressed }) => [styles.loginButton, pressed && styles.loginButtonPressed]}
          onPress={() => console.log(email, password)}
        >
          <LinearGradient colors={[colors.primary, "#D4924A", colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.loginGradient}>
            <Text style={styles.loginText}>Open the vault</Text>
          </LinearGradient>
        </Pressable>

        <Divider />

        <Pressable style={styles.socialButton}>
          <Ionicons name="logo-google" size={22} color={colors.primary} />
          <Text style={styles.socialButtonText}>Continue with Google</Text>
        </Pressable>

        {/* Sign up */}
        <View style={styles.signupRow}>
          <Text style={styles.signupText}>Don't have an account?</Text>
          <Pressable><Text style={styles.signupLink}> Sign up</Text></Pressable>
        </View>

      </Animated.View>

      {/* Fixed bottom watermark */}
      <Text style={styles.bottomLabel}>sealed with futrr</Text>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  centerWrapper: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  // Brand
  brandBlock: {
    alignItems: "center",
    marginBottom: 36,
  },

  sealDotContainer: {
    width: 14, height: 14,
    alignItems: "center", justifyContent: "center",
    marginBottom: 14,
  },

  sealDotRing: {
    position: "absolute",
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: `${colors.primary}28`,
  },

  sealDotCore: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.primary,
  },

  logo: {
    fontSize: 52,
    color: colors.primary,
    letterSpacing: 3,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 60,
  },

  tagline: {
    color: colors.mutedFg,
    fontSize: 13,
    letterSpacing: 1,
    textAlign: "center",
    marginTop: 6,
    fontStyle: "italic",
  },

  // Inputs
  inputsBlock: {
    gap: 12,
    marginBottom: 10,
  },

  inputWrapper: {
    borderRadius: 25,
    borderWidth: 1,
    overflow: "hidden",
  },

  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 18,
    paddingVertical: 15,
    color: colors.foreground,
    fontSize: 15,
    letterSpacing: 0.2,
  },

  forgotPassword: {
    color: `${colors.primary}99`,
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
    marginBottom: 22,
    paddingHorizontal: 10,
    letterSpacing: 0.3,
  },

  // Login button
  loginButton: {
    borderRadius: 25,
    overflow: "hidden",
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    marginBottom: 20,
  },

  loginButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },

  loginGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  loginText: {
    color: colors.primaryFg,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 20,
    gap: 10,
    paddingHorizontal: 15,
  },

  dividerLine: {
    flex: 1, height: 1,
    backgroundColor: colors.border,
  },

  dividerText: {
    color: colors.mutedFg,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // Social
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 25,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
  },

  socialButtonText: {
    color: colors.mutedFg,
    fontSize: 16,
    letterSpacing: 0.2,
  },

  // Sign up
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
  },

  signupText: {
    color: colors.mutedFg,
    fontSize: 13,
  },

  signupLink: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },

  // Fixed bottom watermark
  bottomLabel: {
    position: "absolute",
    bottom: 28,
    left: 0,
    right: 0,
    textAlign: "center",
    color: colors.mutedFg,
    fontSize: 9,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    opacity: 0.3,
  },
});