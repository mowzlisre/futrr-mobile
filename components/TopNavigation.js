import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useContext } from "react";
import { colors } from "../conf";
import { AuthContext } from "../context/AuthContext";
import { clearTokens } from "../services/auth";

export function TopNavigation({ activeTab, activeTitle, handleTabChange }) {
  const { logout } = useContext(AuthContext);


  const handleLogout = async () => {
    try {
      await clearTokens();
      logout();
    } catch (err) {
      console.error("Logout error:", err);
      logout();
    }
  };

  return (
    <View style={styles.container}>
      <View style={{ gap: 4, paddingHorizontal: 8, paddingVertical: 4}}>
        <Text style={styles.tabTitle}>{activeTab}</Text>
        <Text style={styles.tabName}>{activeTitle}</Text>
      </View>
      {
        activeTab !== "Profile" && (
        <View style={styles.rightSection}>
            <Pressable style={styles.profileButton} onPress={() => handleTabChange({ id: "Profile", label: "Your Profile" })}>
            <View style={styles.avatar}>
                <Ionicons name="person" size={18} color={colors.background} />
            </View>
            </Pressable>
        </View>
        )
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 100,
    paddingHorizontal: 24,
    backgroundColor: colors.background,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    
  },
  tabName: {
    fontSize: 28,
    fontWeight: "200",
    color: colors.foreground,
  },
  tabTitle: {
    fontSize: 14,
    fontWeight: "300",
    color: colors.foreground,
    textTransform: "uppercase",
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  profileButton: {
    padding: 8,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.secondaryBackground,
    alignItems: "center",
    justifyContent: "center",
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10
  },
  logoutButton: {
    padding: 8,
  },
});
