import { StyleSheet } from "react-native";
import { colors } from "../../conf";

export const styles = StyleSheet.create({
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
    fontWeight: "800",
    textAlign: "center",
    fontFamily: "Moul",
  },

  tagline: {
    color: colors.mutedFg,
    fontSize: 13,
    letterSpacing: 1,
    textAlign: "center",
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
  bottom: {
    position: "absolute",
    bottom: 28,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
  },

  bottomLabel: {
    color: colors.mutedFg,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    fontSize: 9,
    textAlign: "center",
  }
});
