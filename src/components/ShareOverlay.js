import {
  View,
  Text,
  Modal,
  Image,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { useTheme } from "@/hooks/useTheme";

// ─── Share helpers ────────────────────────────────────────────────────────────

async function saveToGallery(uri) {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permission needed", "Allow photo library access in Settings.");
    return false;
  }
  await MediaLibrary.saveToLibraryAsync(uri);
  return true;
}

async function shareViaSheet(uri) {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "image/png" });
  }
}

// ─── Icon row items ───────────────────────────────────────────────────────────

const ACTIONS = [
  { id: "instagram", icon: "logo-instagram", label: "Instagram", color: "#d4a974" },
  { id: "snapchat",  icon: "logo-snapchat",  label: "Snapchat",  color: "#d4a974" },
  { id: "whatsapp",  icon: "logo-whatsapp",  label: "WhatsApp",  color: "#d4a974" },
  { id: "save",      icon: "arrow-down-circle-outline", label: "Download", color: "#d4a974" },   // uses theme color
];

async function handleAction(id, uri) {
  try {
    if (id === "save") {
      const ok = await saveToGallery(uri);
      if (ok) Alert.alert("Saved", "Image saved to your gallery.");
    } else {
      // All social platforms → native share sheet (user picks the app / destination)
      await shareViaSheet(uri);
    }
  } catch {
    Alert.alert("Error", "Could not share. Please try again.");
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShareOverlay({ visible, imageUri, onClose }) {
  const { isDark, colors } = useTheme();
  const { width: W, height: H } = useWindowDimensions();

  const BG     = isDark ? "#0D0C0A"                : "#FAF8F4";
  const TEXT   = isDark ? "#F5EFE6"                : "#1A1816";
  const DIM    = isDark ? "rgba(245,239,230,0.40)"  : "rgba(26,24,22,0.40)";
  const BORDER = isDark ? "rgba(245,239,230,0.10)"  : "rgba(26,24,22,0.10)";

  // 60% of device width, device portrait aspect ratio
  // Guard against W=0 on first render to prevent NaN → CoreGraphics crash
  const aspectRatio = W > 0 && H > 0 ? H / W : 16 / 9;
  const previewW    = W > 0 ? W * 0.60 : 220;
  const previewH    = previewW * aspectRatio;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: BG }]}>

        {/* Close */}
        <Pressable
          onPress={onClose}
          style={[styles.closeBtn, { borderColor: BORDER }]}
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={20} color={TEXT} />
        </Pressable>

        {/* Preview — 70 % device aspect ratio */}
        <View style={[styles.frame, { width: previewW, height: previewH, borderColor: BORDER }]}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
          ) : (
            <View style={[styles.preview, { backgroundColor: DIM }]} />
          )}
        </View>

        {/* Icon row */}
        <View style={styles.iconRow}>
          {ACTIONS.map(({ id, icon, label, color }) => (
            <Pressable
              key={id}
              onPress={() => handleAction(id, imageUri)}
              style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.55 : 1 }]}
              accessibilityLabel={label}
            >
              <Ionicons
                name={icon}
                size={20}
                color={color ?? TEXT}
              />
              <Text style={[styles.iconLabel, { color: DIM }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
    paddingHorizontal: 20,
  },
  closeBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 58 : 20,
    right: 20,
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  frame: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  preview: {
    width: "100%",
    height: "100%",
  },
  iconRow: {
    flexDirection: "row",
    gap: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtn: {
    alignItems: "center",
    gap: 6,
  },
  iconLabel: {
    fontSize: 8,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
});
