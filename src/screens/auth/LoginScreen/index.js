import { View, Text, Pressable, StyleSheet, Animated, Easing, Keyboard } from "react-native";
import { useState, useRef, useEffect, useContext } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants";
import { loginUser } from "@/services/auth";
import { saveTokens } from "@/services/storage";
import { AuthContext } from "@/context/AuthContext";
import { ParticleField } from "./ParticleField";
import { FutrrInput } from "@/components/ui/FutrrInput";
import { Divider } from "@/components/ui/Divider";
import { styles } from "./styles";

function SealIcon() {
  return (
    <View style={sealStyles.outer}>
      <View style={sealStyles.ring} />
      <View style={sealStyles.inner}>
        <View style={sealStyles.triangle} />
      </View>
    </View>
  );
}

const sealStyles = StyleSheet.create({
  outer: {
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  ring: {
    position: "absolute",
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1.5,
    borderColor: `${colors.primary}55`,
  },
  inner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: `${colors.primary}88`,
    backgroundColor: `${colors.primary}12`,
    alignItems: "center",
    justifyContent: "center",
  },
  triangle: {
    width: 0,
    height: 0,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 17,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: colors.primary,
    marginLeft: 4,
  },
});

export default function LoginScreen() {
  const { login } = useContext(AuthContext);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(32)).current;
  const formSlideUp = useRef(new Animated.Value(100)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const bottomSlideDown = useRef(new Animated.Value(0)).current;
  const bottomOpacity = useRef(new Animated.Value(1)).current;

  const handleOpenForm = () => {
    setShowForm(true);
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(bottomSlideDown, { toValue: 60, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(bottomOpacity, { toValue: 0, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(formSlideUp, { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(formOpacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  };

  const handleCloseForm = () => {
    setShowForm(false);
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(bottomSlideDown, { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(bottomOpacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(formSlideUp, { toValue: 50, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(formOpacity, { toValue: 0, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    if (!identifier || !password) {
      alert("Please enter your credentials");
      return;
    }
    try {
      setLoading(true);
      const data = await loginUser(identifier, password);
      await saveTokens(data.tokens.access, data.tokens.refresh);
      login(data.user);
    } catch (err) {
      alert(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 900, delay: 100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 900, delay: 100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0A0A0F", "#0E0E18", "#0A0A0F"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <ParticleField />

      <Animated.View style={[styles.centerWrapper, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        {/* Brand */}
        <View style={styles.brandBlock}>
          <SealIcon />
          <Text style={styles.logo}>FUTRR</Text>
          <Text style={styles.tagline}>Seal moments in time</Text>
        </View>

        {/* Login Form */}
        <Animated.View style={{ transform: [{ translateY: formSlideUp }], opacity: formOpacity }}>
          <View style={styles.inputsBlock}>
            <FutrrInput
              placeholder="Email, Username, or Phone"
              value={identifier}
              onChangeText={setIdentifier}
            />
            <FutrrInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <Text style={styles.forgotPassword}>Forgot password?</Text>

          <Pressable
            style={({ pressed }) => [styles.loginButton, pressed && styles.loginButtonPressed]}
            onPress={handleLogin}
          >
            <LinearGradient
              colors={[colors.primary, "#D4924A", colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginGradient}
            >
              <Text style={styles.loginText}>
                {loading ? "Opening vault..." : "Open the vault"}
              </Text>
            </LinearGradient>
          </Pressable>

          <Divider />

          <Pressable style={styles.socialButton}>
            <Ionicons name="logo-google" size={22} color={colors.primary} />
            <Text style={styles.socialButtonText}>Continue with Google</Text>
          </Pressable>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account?</Text>
            <Pressable>
              <Text style={styles.signupLink}> Sign up</Text>
            </Pressable>
          </View>

          <Pressable style={{ alignItems: "center", marginTop: 28 }} onPress={handleCloseForm}>
            <Ionicons name="chevron-down" size={28} color={colors.primary} />
          </Pressable>
        </Animated.View>
      </Animated.View>

      {/* Welcome Bottom */}
      <Animated.View
        style={[
          styles.bottom,
          { transform: [{ translateY: bottomSlideDown }], opacity: bottomOpacity },
        ]}
      >
        <View style={{ paddingHorizontal: 32 }}>
          <Pressable
            style={({ pressed }) => [styles.loginButton, pressed && styles.loginButtonPressed]}
            onPress={handleOpenForm}
          >
            <LinearGradient
              colors={[colors.primary, "#D4924A", colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginGradient}
            >
              <Text style={styles.loginText}>ENTER THE VAULT</Text>
            </LinearGradient>
          </Pressable>
        </View>

        <Pressable onPress={handleOpenForm} style={{ alignItems: "center", marginBottom: 40 }}>
          <Text style={styles.alreadyHave}>I ALREADY HAVE AN ACCOUNT</Text>
        </Pressable>

        <Text style={styles.bottomLabel}>sealed with futrr</Text>
      </Animated.View>
    </View>
  );
}
