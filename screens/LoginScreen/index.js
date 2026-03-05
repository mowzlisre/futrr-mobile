import { View, Text, Pressable, StyleSheet, Animated, Easing, Keyboard } from "react-native";
import { useState, useRef, useEffect, useContext } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../conf";
import { loginUser, saveTokens } from "../../services/auth";
import { AuthContext } from "../../context/AuthContext";
import { ParticleField } from "./ParticleField";
import { FutrrInput } from "./FutrrInput";
import { Divider } from "./Divider";
import { styles } from "./styles";

export default function LoginScreen() {
  const { login } = useContext(AuthContext);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showForm, setShowForm] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(32)).current;
  const formSlideUp = useRef(new Animated.Value(100)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const bottomSlideDown = useRef(new Animated.Value(0)).current;
  const bottomOpacity = useRef(new Animated.Value(1)).current;
  const [loading, setLoading] = useState(false);

  const handleOpenForm = () => {
    setShowForm(true);
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(bottomSlideDown, { toValue: 50, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(bottomOpacity, { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
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
      Animated.timing(formOpacity, { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    if (!identifier || !password) {
      alert("Please enter email/username and password");
      return;
    }

    try {
      setLoading(true);

      const data = await loginUser(identifier, password);

      const accessToken = data.tokens.access;
      const refreshToken = data.tokens.refresh;
      await saveTokens(accessToken, refreshToken);

      login(data.user);

    } catch (err) {
      console.log(err);
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

      <LinearGradient colors={["#0A0A0F", "#0E0E18", "#0A0A0F"]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

      <ParticleField />

      <Animated.View style={[styles.centerWrapper, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>

        {/* Brand */}
        <View style={styles.brandBlock}>
          <Text style={styles.logo}>futrr</Text>
          <Text style={styles.tagline}>Leave something worth waiting for.</Text>
        </View>

        {/* Form - Hidden and Slides up when showForm is true */}
        <Animated.View style={{ transform: [{ translateY: formSlideUp }], opacity: formOpacity }}>
          <View style={styles.inputsBlock}>
            <FutrrInput placeholder="Email, Username, or Phone" value={identifier} onChangeText={setIdentifier} />
            <FutrrInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
          </View>

          <Text style={styles.forgotPassword}>Forgot password?</Text>

          <Pressable
            style={({ pressed }) => [styles.loginButton, pressed && styles.loginButtonPressed]}
            onPress={handleLogin}
          >
            <LinearGradient colors={[colors.primary, "#D4924A", colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.loginGradient}>
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

          {/* Sign up */}
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account?</Text>
            <Pressable><Text style={styles.signupLink}> Sign up</Text></Pressable>
          </View>

          {/* Close Form Button with Chevron */}
          <Pressable
            style={{ alignItems: "center", marginTop: 30 }}
            onPress={handleCloseForm}
          >
            <Ionicons name="chevron-down" size={28} color={colors.primary} />
          </Pressable>
        </Animated.View>

      </Animated.View>

      {/* Bottom Card - Slides down when form is shown */}
      <Animated.View style={[styles.bottom, { transform: [{ translateY: bottomSlideDown }], opacity: bottomOpacity }]}>
        <View style={{paddingHorizontal: 40}}>
          <Pressable
              style={({ pressed }) => [styles.loginButton, pressed && styles.loginButtonPressed]}
              onPress={handleOpenForm}
            >
              <LinearGradient colors={[colors.primary, "#D4924A", colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.loginGradient}>
                <Text style={styles.loginText}>
                  LOGIN
                </Text>
              </LinearGradient>
            </Pressable>
        </View>
        <View style={{alignItems: "center", marginBottom: 52}}>
          <Text style={{color: colors.mutedFg, fontSize: 14, letterSpacing: 1.5, textTransform: "uppercase"}}>I already have an account</Text>
        </View>
        <Text style={styles.bottomLabel}>sealed with futrr</Text>
      </Animated.View>

    </View>
  );
}
