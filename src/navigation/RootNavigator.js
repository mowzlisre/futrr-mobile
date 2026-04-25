import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useState, useEffect } from "react";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import SplashLoader from "@/components/SplashLoader";
import LoginScreen from "@/screens/auth/LoginScreen";
import OnboardingScreen from "@/screens/auth/OnboardingScreen";
import ForgotPasswordScreen from "@/screens/auth/ForgotPasswordScreen";
import MainApp from "@/screens/app/MainApp";
import LockedCapsuleScreen from "@/screens/app/LockedCapsuleScreen";
import UnlockedCapsuleScreen from "@/screens/app/UnlockedCapsuleScreen";
import CreateCapsuleScreen from "@/screens/app/CreateCapsuleScreen";
import CreateEventScreen from "@/screens/app/CreateEventScreen";
import EditEventScreen from "@/screens/app/EditEventScreen";
import EventDetailScreen from "@/screens/app/EventDetailScreen";
import AtlasScreen from "@/screens/app/AtlasScreen";
import FavoritesScreen from "@/screens/app/FavoritesScreen";
import NotificationsScreen from "@/screens/app/NotificationsScreen";
import SettingsScreen from "@/screens/app/SettingsScreen";
import UserProfileScreen from "@/screens/app/UserProfileScreen";
import QuotaScreen from "@/screens/app/QuotaScreen";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isLoggedIn, initializing, user } = useAuth();
  const { colors } = useTheme();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), 4000);
    return () => clearTimeout(t);
  }, []);

  if (initializing || !splashDone) {
    return <SplashLoader />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      {isLoggedIn && user?.isPreboarded ? (
        <>
          <Stack.Screen name={ROUTES.MAIN_APP} component={MainApp} />
          <Stack.Screen name={ROUTES.LOCKED_CAPSULE} component={LockedCapsuleScreen} />
          <Stack.Screen name={ROUTES.UNLOCKED_CAPSULE} component={UnlockedCapsuleScreen} />
          <Stack.Screen name={ROUTES.ATLAS} component={AtlasScreen} />
          <Stack.Screen name={ROUTES.FAVORITES} component={FavoritesScreen} />
          <Stack.Screen name={ROUTES.NOTIFICATIONS} component={NotificationsScreen} />
          <Stack.Screen name={ROUTES.SETTINGS} component={SettingsScreen} />
          <Stack.Screen name={ROUTES.USER_PROFILE} component={UserProfileScreen} />
          <Stack.Screen name={ROUTES.QUOTA} component={QuotaScreen} />
          <Stack.Screen
            name={ROUTES.CREATE_CAPSULE}
            component={CreateCapsuleScreen}
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name={ROUTES.CREATE_EVENT}
            component={CreateEventScreen}
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />
          <Stack.Screen name={ROUTES.EVENT_DETAIL} component={EventDetailScreen} />
          <Stack.Screen
            name={ROUTES.EDIT_EVENT}
            component={EditEventScreen}
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />
        </>
      ) : isLoggedIn && !user?.isPreboarded ? (
        <Stack.Screen
          name={ROUTES.ONBOARDING}
          component={OnboardingScreen}
          initialParams={{ startStep: 4 }}
        />
      ) : (
        <>
          <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
          <Stack.Screen name={ROUTES.ONBOARDING} component={OnboardingScreen} />
          <Stack.Screen name={ROUTES.FORGOT_PASSWORD} component={ForgotPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
