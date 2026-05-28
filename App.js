import { useEffect } from "react";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { TourProvider } from "@/context/TourContext";
import { QuotaProvider } from "@/context/QuotaContext";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import RootNavigator from "@/navigation/RootNavigator";

SplashScreen.preventAutoHideAsync();

function QuotaWrapper({ children }) {
  const { isLoggedIn } = useAuth();
  return <QuotaProvider isLoggedIn={isLoggedIn}>{children}</QuotaProvider>;
}

function AppInner() {
  const { colors, isDark } = useTheme();

  const navTheme = {
    dark: isDark,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.foreground,
      border: colors.border,
      notification: colors.primary,
    },
    fonts: {
      regular: { fontFamily: "System", fontWeight: "400" },
      medium: { fontFamily: "System", fontWeight: "500" },
      bold: { fontFamily: "System", fontWeight: "700" },
      heavy: { fontFamily: "System", fontWeight: "900" },
    },
  };

  return (
    <SafeAreaProvider>
      <QuotaWrapper>
        <NavigationContainer theme={navTheme}>
          <RootNavigator />
        </NavigationContainer>
        <StatusBar style={isDark ? "light" : "dark"} />
      </QuotaWrapper>
    </SafeAreaProvider>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Moul: require("./assets/fonts/Moul.ttf"),
    MrsSans: require("./assets/fonts/MrsSans.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <TourProvider>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </TourProvider>
    </ThemeProvider>
  );
}
