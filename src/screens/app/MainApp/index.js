import { View, Text, Pressable, StyleSheet } from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors, TABS, ROUTES } from "@/constants";
import { TopNavigation } from "@/components/navigation/TopNavigation";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { getNotifications } from "@/services/notifications";
import VaultScreen from "@/screens/app/VaultScreen";
import DiscoverScreen from "@/screens/app/DiscoverScreen";
import TimelineScreen from "@/screens/app/TimelineScreen";
import ProfileScreen from "@/screens/app/ProfileScreen";

export default function MainApp() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState(TABS.VAULT);
  const [activeTitle, setActiveTitle] = useState("Your Capsules");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const data = await getNotifications({ unreadOnly: true });
        setUnreadCount(data.length);
      } catch (_) {}
    };
    fetchUnread();
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab.id);
    setActiveTitle(tab.label);
  };

  const getRightElement = () => {
    if (activeTab === TABS.VAULT) {
      return (
        <View style={styles.headerActions}>
          {/* Heart → Favorites */}
          <Pressable
            onPress={() => navigation.navigate(ROUTES.FAVORITES)}
            style={styles.headerBtn}
          >
            <Ionicons name="heart-outline" size={22} color={colors.mutedFg} />
          </Pressable>

          {/* Bell → Notifications */}
          <Pressable
            onPress={() => {
              navigation.navigate(ROUTES.NOTIFICATIONS);
              setUnreadCount(0);
            }}
            style={styles.headerBtn}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.mutedFg} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      );
    }

    if (activeTab === TABS.DISCOVER) {
      return (
        <Pressable
          onPress={() => navigation.navigate(ROUTES.ATLAS)}
          style={styles.headerBtn}
        >
          <Ionicons name="earth-outline" size={24} color={colors.mutedFg} />
        </Pressable>
      );
    }

    if (activeTab === TABS.PROFILE) {
      return (
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => navigation.navigate(ROUTES.FOLLOW_REQUESTS)}
            style={styles.headerBtn}
          >
            <Ionicons name="people-outline" size={22} color={colors.mutedFg} />
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate(ROUTES.SETTINGS)}
            style={styles.headerBtn}
          >
            <Ionicons name="settings-outline" size={22} color={colors.mutedFg} />
          </Pressable>
        </View>
      );
    }

    return null;
  };

  const renderScreen = () => {
    switch (activeTab) {
      case TABS.DISCOVER:
        return <DiscoverScreen />;
      case TABS.TIMELINE:
        return <TimelineScreen />;
      case TABS.PROFILE:
        return <ProfileScreen />;
      default:
        return <VaultScreen />;
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top", "bottom"]}
    >
      <View style={{ flex: 1 }}>
        <TopNavigation
          activeTab={activeTab}
          activeTitle={activeTitle}
          rightElement={getRightElement()}
        />
        <View style={{ flex: 1, paddingBottom: 80 }}>{renderScreen()}</View>
        <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.primaryFg,
  },
});
