import { View, Text } from "react-native";
import { colors } from "../conf";

export default function FavoritesScreen() {
  return (
    <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 20, color: colors.foreground }}>Favorites Screen</Text>
    </View>
  );
}
