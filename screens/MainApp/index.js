import { View } from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../conf";
import { TopNavigation } from "../../components/TopNavigation";
import { BottomNavigation } from "../../components/BottomNavigation";
import VaultScreen from "../VaultScreen";
import DiscoverScreen from "../DiscoverScreen";
import TimelineScreen from "../TimelineScreen";
import ProfileScreen from "../ProfileScreen";
import FavoritesScreen from "../FavoritesScreen";
import AtlasScreen from "../AtlasScreen";

export default function MainApp() {
  const [activeTab, setActiveTab] = useState("The Vault");
  const [activeTitle, setActiveTitle] = useState("Your Capsules");


  const handleTabChange = (tabId) => {
    setActiveTab(tabId.id);
    setActiveTitle(tabId.label);
  };

  const renderScreen = () => {
    switch (activeTab) {
      case "Discover":
        return <DiscoverScreen />;
      case "Favorites":
        return <FavoritesScreen />;
      case "Atlas":
        return <AtlasScreen />;
      case "Timeline":
        return <TimelineScreen />;
      case "Profile":
        return <ProfileScreen />;
      default:
        return <VaultScreen />;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom"]}>

      <View style={{ flex: 1 }}>
        {/* Top Navigation */}
        <TopNavigation activeTab={activeTab} activeTitle={activeTitle} handleTabChange={handleTabChange} />

        {/* Screen Content */}
        <View style={{ flex: 1 }}>
          {renderScreen()}
        </View>

        {/* Bottom Navigation */}
        <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      </View>
    </SafeAreaView>
  );
}