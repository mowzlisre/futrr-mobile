import { View, Text } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors, ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import LoginScreen from "@/screens/auth/LoginScreen";
import MainApp from "@/screens/app/MainApp";
import LockedCapsuleScreen from "@/screens/app/LockedCapsuleScreen";
import UnlockedCapsuleScreen from "@/screens/app/UnlockedCapsuleScreen";
import CreateCapsuleScreen from "@/screens/app/CreateCapsuleScreen";
import AtlasScreen from "@/screens/app/AtlasScreen";
import FavoritesScreen from "@/screens/app/FavoritesScreen";
import NotificationsScreen from "@/screens/app/NotificationsScreen";
import SettingsScreen from "@/screens/app/SettingsScreen";
import FollowRequestsScreen from "@/screens/app/FollowRequestsScreen";
import UserProfileScreen from "@/screens/app/UserProfileScreen";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isLoggedIn, initializing } = useAuth();

  if (initializing) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 16, color: colors.foreground }}>Loading...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      {isLoggedIn ? (
        <>
          <Stack.Screen name={ROUTES.MAIN_APP} component={MainApp} />
          <Stack.Screen name={ROUTES.LOCKED_CAPSULE} component={LockedCapsuleScreen} />
          <Stack.Screen name={ROUTES.UNLOCKED_CAPSULE} component={UnlockedCapsuleScreen} />
          <Stack.Screen name={ROUTES.ATLAS} component={AtlasScreen} />
          <Stack.Screen name={ROUTES.FAVORITES} component={FavoritesScreen} />
          <Stack.Screen name={ROUTES.NOTIFICATIONS} component={NotificationsScreen} />
          <Stack.Screen name={ROUTES.SETTINGS} component={SettingsScreen} />
          <Stack.Screen name={ROUTES.FOLLOW_REQUESTS} component={FollowRequestsScreen} />
          <Stack.Screen name={ROUTES.USER_PROFILE} component={UserProfileScreen} />
          <Stack.Screen
            name={ROUTES.CREATE_CAPSULE}
            component={CreateCapsuleScreen}
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />
        </>
      ) : (
        <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
