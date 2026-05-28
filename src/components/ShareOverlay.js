import {
  View,
  Text,
  Modal,
  Image,
  Pressable,
  StyleSheet,
  Alert,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
let RNShare = null;
try { RNShare = require("react-native-share").default; } catch (_) {}
import { useTheme } from "@/hooks/useTheme";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function toBase64DataUri(uri) {
  const b64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
  return `data:image/png;base64,${b64}`;
}

async function saveToGallery(uri) {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permission needed", "Allow photo library access in Settings.");
    return false;
  }
  await MediaLibrary.saveToLibraryAsync(uri);
  return true;
}

function catchShare(err) {
  const msg = err?.message ?? "";
  if (
    msg.includes("User did not share") ||
    msg.includes("userCancelled") ||
    msg.includes("cancelled") ||
    msg === "com.apple.UIKit.activity.Cancel"
  ) return; // silent cancel
  if (
    msg.includes("not installed") ||
    msg.includes("Package not found") ||
    msg.includes("No Activity found") ||
    msg.includes("No app to handle") ||
    msg.includes("ActivityNotFoundException")
  ) {
    Alert.alert("App not installed", "That app isn't installed on this device.");
    return;
  }
  Alert.alert("Could not share", "Please try again.");
}


// ─── Action definitions ───────────────────────────────────────────────────────

const ACTIONS = [
  { id: "instagram_stories", icon: "logo-instagram", label: "Stories" },
  { id: "whatsapp",          icon: "logo-whatsapp",  label: "WhatsApp" },
  { id: "snapchat",          icon: "logo-snapchat",  label: "Snapchat" },
  { id: "telegram",          icon: "send-outline",   label: "Telegram" },
  { id: "more",              icon: "share-outline",  label: "More"     },
  { id: "save",              icon: "arrow-down-circle-outline", label: "Save" },
];

async function handleAction(id, imageUri) {
  try {
    switch (id) {
      case "instagram_stories": {
        if (!RNShare) { await Sharing.shareAsync(imageUri, { mimeType: "image/png" }); break; }
        const bg = await toBase64DataUri(imageUri);
        await RNShare.shareSingle({ social: RNShare.Social.INSTAGRAM_STORIES, appId: "YOUR_FACEBOOK_APP_ID", stickerImage: bg });
        break;
      }
      case "whatsapp":
        if (!RNShare) { await Sharing.shareAsync(imageUri, { mimeType: "image/png" }); break; }
        await RNShare.shareSingle({ social: RNShare.Social.WHATSAPP, url: imageUri, type: "image/png", message: "" });
        break;
      case "snapchat": {
        if (!RNShare) { await Sharing.shareAsync(imageUri, { mimeType: "image/png" }); break; }
        const img = await toBase64DataUri(imageUri);
        await RNShare.shareSingle({ social: RNShare.Social.SNAPCHAT, url: img });
        break;
      }
      case "telegram":
        if (!RNShare) { await Sharing.shareAsync(imageUri, { mimeType: "image/png" }); break; }
        await RNShare.shareSingle({ social: RNShare.Social.TELEGRAM, url: imageUri, type: "image/png", message: "" });
        break;
      case "more":
        await Sharing.shareAsync(imageUri, { mimeType: "image/png" });
        break;
      case "save": {
        const ok = await saveToGallery(imageUri);
        if (ok) Alert.alert("Saved", "Image saved to your gallery.");
        break;
      }
    }
  } catch (err) {
    catchShare(err);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShareOverlay({ visible, imageUri, onClose }) {
  const { colors } = useTheme();
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const BG     = colors.background;
  const TEXT   = colors.foreground;
  const DIM    = colors.mutedFg;
  const BORDER = colors.border;

  const aspectRatio = W > 0 && H > 0 ? H / W : 16 / 9;
  const previewW    = W > 0 ? W * 0.60 : 220;
  const previewH    = previewW * aspectRatio;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: BG }]}>

        {/* Close */}
        <Pressable
          onPress={onClose}
          style={[styles.closeBtn, { borderColor: BORDER, top: insets.top + 32 }]}
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={20} color={TEXT} />
        </Pressable>

        {/* Preview */}
        <View style={[styles.frame, { width: previewW, height: previewH, borderColor: BORDER }]}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
          ) : (
            <View style={[styles.preview, { backgroundColor: DIM }]} />
          )}
        </View>

        {/* Icon row */}
        <View style={styles.iconRow}>
          {ACTIONS.map(({ id, icon, label }) => (
            <Pressable
              key={id}
              onPress={() => handleAction(id, imageUri)}
              style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.55 : 1 }]}
              accessibilityLabel={label}
            >
              <Ionicons name={icon} size={20} color={colors.primary} />
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
    top: 12,
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
    flexWrap: "wrap",
    gap: 24,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  iconBtn: {
    alignItems: "center",
    gap: 6,
    minWidth: 52,
  },
  iconLabel: {
    fontSize: 9,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
});
