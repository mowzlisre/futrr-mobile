import { View, Text } from "react-native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import LoginScreen from "./screens/LoginScreen";

SplashScreen.preventAutoHideAsync();

const styles = {
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#01010F",
  },
  title: {
    fontFamily: "Moul",
    fontSize: 48,
    fontWeight: "bold",
    color: "#eaa646"
  },
  error: {
    marginTop: 10,
    color: "red",
  },
};

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Moul: require("./assets/fonts/Moul.ttf"),
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
    <LoginScreen />
  );
}