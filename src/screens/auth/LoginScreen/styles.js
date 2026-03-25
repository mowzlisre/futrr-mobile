import { StyleSheet } from "react-native";

export const makeStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    centerWrapper: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 28,
    },

    brandBlock: {
      alignItems: "center",
      marginBottom: 24,
    },

    logo: {
      fontSize: 48,
      color: colors.primary,
      fontWeight: "300",
      textAlign: "center",
      fontFamily: "Moul",
    },

    tagline: {
      color: colors.mutedFg,
      fontSize: 13,
      letterSpacing: 0.5,
      textAlign: "center",
    },

    inputsBlock: {
      gap: 12,
      marginBottom: 10,
    },

    forgotPassword: {
      color: `${colors.primary}99`,
      fontSize: 12,
      lineHeight: 17,
      textAlign: "right",
      marginTop: 4,
      marginBottom: 22,
      paddingHorizontal: 10,
      letterSpacing: 0.3,
    },

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
      fontSize: 14,
      fontWeight: "700",
      letterSpacing: 2,
      textTransform: "uppercase",
    },

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
      fontSize: 14,
      letterSpacing: 0.2,
    },

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

    bottom: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 24,
    },

    alreadyHave: {
      color: colors.mutedFg,
      fontSize: 11,
      lineHeight: 16,
      letterSpacing: 2,
      textTransform: "uppercase",
      textAlign: "center",
      marginBottom: 8,
    },

    bottomLabel: {
      color: `${colors.mutedFg}66`,
      letterSpacing: 2.5,
      textTransform: "uppercase",
      fontSize: 9,
      lineHeight: 13,
      textAlign: "center",
      paddingBottom: 24,
    },
  });
