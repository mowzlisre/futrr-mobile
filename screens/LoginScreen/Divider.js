import { View, Text } from "react-native";
import { colors } from "../../conf";
import { styles } from "./styles";

export function Divider() {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>or</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}
