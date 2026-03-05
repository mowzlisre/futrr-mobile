import { View, Text } from "react-native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import LoginScreen from "./screens/LoginScreen";
import MainApp from "./screens/MainApp";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "./conf";

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { isLoggedIn, initializing } = useContext(AuthContext);

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 16, color: colors.foreground }}>Loading...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <Stack.Screen name="MainApp" component={MainApp} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

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
    <AuthProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
        <StatusBar style="light"  />
      </SafeAreaProvider>
    </AuthProvider>
  );
}