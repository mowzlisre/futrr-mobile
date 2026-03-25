import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Alert,
  Image,
  FlatList,
  ActivityIndicator,
  Share,
  Animated,
} from "react-native";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import * as Location from "expo-location";
import { getDaysUntil } from "@/utils/date";
import { createCapsule, addCapsuleContent } from "@/services/capsules";
import { searchUsers } from "@/services/user";
import { generatePassphrase, storePassphrase } from "@/utils/passphrase";
import { useAuth } from "@/hooks/useAuth";
import { normalizeCapsule } from "@/utils/normalize";
import { vaultBus } from "@/utils/vaultBus";
import { hapticSuccess, hapticError } from "@/utils/haptics";

// ─── RecordingWaveform ────────────────────────────────────────────────────────

const NUM_BARS = 24;
const BAR_MIN_H = 3;

function RecordingWaveform({ isActive }) {
  const { colors } = useTheme();
  const animVals = useRef(
    Array.from({ length: NUM_BARS }, () => new Animated.Value(BAR_MIN_H))
  ).current;

  useEffect(() => {
    if (isActive) {
      const anims = animVals.map((val, i) => {
        const maxH = BAR_MIN_H + 4 + (i % 5) * 7; // 7..31
        const up = Animated.timing(val, {
          toValue: maxH,
          duration: 300 + (i % 4) * 80,
          useNativeDriver: false,
        });
        const down = Animated.timing(val, {
          toValue: BAR_MIN_H,
          duration: 300 + (i % 4) * 80,
          useNativeDriver: false,
        });
        return Animated.loop(Animated.sequence([up, down]));
      });
      Animated.stagger(25, anims).start();
      return () => {
        anims.forEach((a) => a.stop());
        animVals.forEach((v) => v.setValue(BAR_MIN_H));
      };
    } else {
      animVals.forEach((v) => v.setValue(BAR_MIN_H));
    }
  }, [isActive]);

  return (
    <View style={waveStyles.container}>
      {animVals.map((val, i) => (
        <Animated.View
          key={i}
          style={[
            waveStyles.bar,
            {
              height: val,
              backgroundColor: isActive ? colors.primary : `${colors.primary}55`,
            },
          ]}
        />
      ))}
    </View>
  );
}

const waveStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    gap: 3,
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
});

// ─── constants ───────────────────────────────────────────────────────────────

const TYPES = [
  { id: "MESSAGE", icon: "document-text-outline", label: "MESSAGE" },
  { id: "PHOTO", icon: "image-outline", label: "PHOTO" },
  { id: "VOICE", icon: "mic-outline", label: "VOICE" },
];

const MAX_PHOTOS = 5;
const MAX_VOICE_SECS = 60;

const MIN_DATE = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
})();

const DEFAULT_DATE = new Date("2026-12-25");

// ─── helpers ─────────────────────────────────────────────────────────────────


function formatSeconds(secs) {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ─── TypeSelector ─────────────────────────────────────────────────────────────

function TypeSelector({ activeType, onSelect }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.typeRow}>
      {TYPES.map((t) => (
        <Pressable
          key={t.id}
          onPress={() => onSelect(t.id)}
          style={[styles.typeCard, activeType === t.id && styles.typeCardActive]}
        >
          <Ionicons
            name={t.icon}
            size={26}
            color={activeType === t.id ? colors.primaryFg : colors.mutedFg}
          />
          <Text
            style={[
              styles.typeLabel,
              activeType === t.id && styles.typeLabelActive,
            ]}
          >
            {t.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── PhotoCapture ─────────────────────────────────────────────────────────────

function PhotoCapture({ photos, video, photoMode, onPhotosChange, onVideoChange, onModeChange }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const canAddMore = photoMode === "photos" && photos.length < MAX_PHOTOS;

  const launchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Camera access is needed to capture photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      quality: 0.85,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      onPhotosChange([...photos, result.assets[0].uri]);
    }
  };

  const launchVideoCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Camera access is needed to record video.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "videos",
      videoMaxDuration: 60,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      onVideoChange(result.assets[0].uri);
    }
  };

  const removePhoto = (index) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  const switchMode = (mode) => {
    if (mode === photoMode) return;
    if (mode === "photos") {
      onVideoChange(null);
    } else {
      onPhotosChange([]);
    }
    onModeChange(mode);
  };

  return (
    <View style={styles.captureContainer}>
      {/* Mode toggle */}
      <View style={styles.modeToggle}>
        <Pressable
          onPress={() => switchMode("photos")}
          style={[
            styles.modeBtn,
            photoMode === "photos" && styles.modeBtnActive,
          ]}
        >
          <Ionicons
            name="images-outline"
            size={14}
            color={photoMode === "photos" ? colors.primaryFg : colors.mutedFg}
          />
          <Text
            style={[
              styles.modeBtnText,
              photoMode === "photos" && styles.modeBtnTextActive,
            ]}
          >
            Up to 5 Photos
          </Text>
        </Pressable>
        <Pressable
          onPress={() => switchMode("video")}
          style={[
            styles.modeBtn,
            photoMode === "video" && styles.modeBtnActive,
          ]}
        >
          <Ionicons
            name="videocam-outline"
            size={14}
            color={photoMode === "video" ? colors.primaryFg : colors.mutedFg}
          />
          <Text
            style={[
              styles.modeBtnText,
              photoMode === "video" && styles.modeBtnTextActive,
            ]}
          >
            1 Video (60s)
          </Text>
        </Pressable>
      </View>

      {/* Photos grid */}
      {photoMode === "photos" && (
        <View style={styles.photosGrid}>
          {photos.map((uri, index) => (
            <View key={index} style={styles.photoThumb}>
              <Image source={{ uri }} style={styles.photoThumbImg} />
              <Pressable
                onPress={() => removePhoto(index)}
                style={styles.photoRemoveBtn}
              >
                <Ionicons name="close-circle" size={20} color="#fff" />
              </Pressable>
            </View>
          ))}
          {canAddMore && (
            <Pressable onPress={launchCamera} style={styles.cameraAddBtn}>
              <Ionicons name="camera-outline" size={24} color={colors.mutedFg} />
              <Text style={styles.cameraAddText}>
                {photos.length === 0 ? "Take Photo" : `${photos.length}/${MAX_PHOTOS}`}
              </Text>
            </Pressable>
          )}
          {photos.length === MAX_PHOTOS && (
            <View style={styles.maxReachedBadge}>
              <Text style={styles.maxReachedText}>Max {MAX_PHOTOS} photos</Text>
            </View>
          )}
        </View>
      )}

      {/* Video capture */}
      {photoMode === "video" && (
        <View>
          {video ? (
            <View style={styles.videoPreview}>
              <Ionicons name="videocam" size={28} color={colors.primary} />
              <Text style={styles.videoPreviewText}>Video recorded (max 60s)</Text>
              <Pressable onPress={() => onVideoChange(null)} style={styles.videoRemoveBtn}>
                <Ionicons name="trash-outline" size={18} color={colors.mutedFg} />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={launchVideoCamera} style={styles.videoRecordBtn}>
              <Ionicons name="videocam-outline" size={28} color={colors.mutedFg} />
              <Text style={styles.cameraAddText}>Record Video</Text>
              <Text style={styles.videoHint}>Up to 60 seconds</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

// ─── VoiceRecorder ────────────────────────────────────────────────────────────

function VoiceRecorder({ recordedUri, onRecorded }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  // Hooks must be at top level — recorder and player are always created
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder, 500);
  // Always start with null so the player doesn't try to load before we have a URI
  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);

  const isRecording = recState.isRecording ?? false;
  // durationMillis is in ms; convert to whole seconds for display
  const duration = Math.floor((recState.durationMillis ?? 0) / 1000);
  const playing = playerStatus.playing ?? false;

  // Auto-stop at 60s
  useEffect(() => {
    if (isRecording && duration >= MAX_VOICE_SECS) {
      stopRecording();
    }
  }, [duration, isRecording]);

  // When recordedUri becomes available, load it into the player
  useEffect(() => {
    if (recordedUri) {
      player.replace({ uri: recordedUri });
    }
  }, [recordedUri]);

  const startRecording = async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert("Permission required", "Microphone access is needed to record audio.");
        return;
      }
      // expo-audio 1.x uses allowsRecording / playsInSilentMode (not the expo-av iOS-suffix names)
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (err) {
      Alert.alert("Recording error", "Could not start recording. Please try again.");
    }
  };

  const stopRecording = async () => {
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = recorder.uri;
      if (uri) {
        onRecorded(uri);
      } else {
        Alert.alert("Recording error", "No audio was captured. Please try again.");
      }
    } catch (err) {
      Alert.alert("Recording error", "Could not save the recording. Please try again.");
    }
  };

  const playback = () => {
    if (!recordedUri) return;
    if (playing) {
      player.pause();
    } else {
      if (playerStatus.didJustFinish) player.seekTo(0);
      player.play();
    }
  };

  const discard = () => {
    player.pause();
    onRecorded(null);
  };

  const progress = Math.min(duration / MAX_VOICE_SECS, 1);

  return (
    <View style={styles.voiceContainer}>
      {!recordedUri ? (
        <>
          {/* Animated waveform + timer */}
          <RecordingWaveform isActive={isRecording} />
          <Text style={styles.voiceTimerText}>
            {isRecording ? formatSeconds(duration) : "00:00"}
          </Text>

          {/* Record / Stop button */}
          <Pressable
            onPress={isRecording ? stopRecording : startRecording}
            style={[
              styles.recordBtn,
              isRecording && styles.recordBtnActive,
            ]}
          >
            <Ionicons
              name={isRecording ? "stop" : "mic"}
              size={32}
              color={colors.primaryFg}
            />
          </Pressable>

          <Text style={styles.voiceHint}>
            {isRecording ? "Tap to stop" : "Tap to start recording"}
          </Text>
        </>
      ) : (
        /* Playback UI */
        <View style={styles.voicePlayback}>
          <Pressable onPress={playback} style={styles.playBtn}>
            <Ionicons
              name={playing ? "stop" : "play"}
              size={24}
              color={colors.primaryFg}
            />
          </Pressable>
          <View style={{ flex: 1, gap: 6 }}>
            <RecordingWaveform isActive={playing} />
            <Text style={styles.voicePlaybackSub}>{formatSeconds(duration)} · Tap to preview</Text>
          </View>
          <Pressable onPress={discard} style={styles.discardBtn}>
            <Ionicons name="trash-outline" size={18} color={colors.mutedFg} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── SendToModal ──────────────────────────────────────────────────────────────

function SendToModal({ visible, recipient, onSelect, onDismiss }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  const handleSearch = useCallback((text) => {
    setQuery(text);
    clearTimeout(debounceRef.current);
    if (!text.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        setSearching(true);
        const users = await searchUsers(text.trim());
        setResults(users);
      } catch (_) {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  const handleSelectMyself = () => {
    onSelect({ type: "myself", label: "Myself", initial: "M" });
    onDismiss();
  };

  const handleSelectUser = (user) => {
    const displayName = user.username || user.email || "User";
    onSelect({
      type: "user",
      label: displayName,
      initial: displayName[0].toUpperCase(),
      value: user.id ?? user.pk,
    });
    onDismiss();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={onDismiss}>
        <Pressable style={styles.sendToCard} onPress={() => {}}>
          <Text style={styles.sendToTitle}>SEND TO</Text>

          {/* Myself — always pinned at top */}
          <Pressable
            onPress={handleSelectMyself}
            style={[
              styles.sendToOption,
              recipient.type === "myself" && styles.sendToOptionActive,
            ]}
          >
            <View style={styles.sendToAvatar}>
              <Text style={styles.sendToAvatarText}>M</Text>
            </View>
            <Text style={styles.sendToOptionLabel}>Myself</Text>
            {recipient.type === "myself" && (
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            )}
          </Pressable>

          {/* Divider */}
          <View style={styles.sendToDivider}>
            <View style={styles.sendToDividerLine} />
            <Text style={styles.sendToDividerText}>or find someone</Text>
            <View style={styles.sendToDividerLine} />
          </View>

          {/* Search bar */}
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={16} color={colors.mutedFg} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by username or email..."
              placeholderTextColor={colors.mutedFg}
              value={query}
              onChangeText={handleSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searching && (
              <ActivityIndicator size="small" color={colors.primary} />
            )}
          </View>

          {/* Search results */}
          {results.length > 0 && (
            <FlatList
              data={results}
              keyExtractor={(u) => String(u.id ?? u.pk ?? u.username)}
              style={styles.resultsList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const name = item.username || item.email || "User";
                const selected =
                  recipient.type === "user" && recipient.value === (item.id ?? item.pk);
                return (
                  <Pressable
                    onPress={() => handleSelectUser(item)}
                    style={[styles.sendToOption, selected && styles.sendToOptionActive]}
                  >
                    <View style={styles.sendToAvatar}>
                      <Text style={styles.sendToAvatarText}>
                        {name[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sendToOptionLabel}>{name}</Text>
                      {item.email && item.username && (
                        <Text style={styles.sendToOptionSub}>{item.email}</Text>
                      )}
                    </View>
                    {selected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={colors.primary}
                      />
                    )}
                  </Pressable>
                );
              }}
            />
          )}

          {query.trim() && !searching && results.length === 0 && (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No users found</Text>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── main screen ─────────────────────────────────────────────────────────────

export default function CreateCapsuleScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();

  // Event participation context (passed from EventDetailScreen)
  const event = route.params?.event || null;

  // Form state
  const [type, setType] = useState("MESSAGE");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [unlockDate, setUnlockDate] = useState(
    event?.is_time_locked && event?.unlock_at
      ? new Date(event.unlock_at)
      : DEFAULT_DATE
  );
  const [recipient, setRecipient] = useState({
    type: "myself",
    label: "Myself",
    initial: "M",
  });

  // Photo/video state
  const [photoMode, setPhotoMode] = useState("photos"); // 'photos' | 'video'
  const [photos, setPhotos] = useState([]);
  const [video, setVideo] = useState(null);

  // Voice state
  const [recordedUri, setRecordedUri] = useState(null);

  // Separate date and time pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(DEFAULT_DATE);
  const [tempTime, setTempTime] = useState(DEFAULT_DATE);

  // Settings accordion (encryption + visibility + atlas + send-to)
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [encryptionType, setEncryptionType] = useState("auto");
  const [passphraseHint, setPassphraseHint] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [showInAtlas, setShowInAtlas] = useState(false);
  const [atlasLocation, setAtlasLocation] = useState(null); // { lat, lng, name }
  const [fetchingLocation, setFetchingLocation] = useState(false);

  // Modals
  const [showSendTo, setShowSendTo] = useState(false);
  const [revealedPassphrase, setRevealedPassphrase] = useState(null); // set after seal

  // Submit
  const [sealing, setSealing] = useState(false);

  // ── type switch — reset media state ───────────────────────────────────────

  const handleTypeChange = (newType) => {
    setType(newType);
    setPhotos([]);
    setVideo(null);
    setRecordedUri(null);
    setPhotoMode("photos");
  };

  // ── date picker ───────────────────────────────────────────────────────────

  const openDatePicker = () => {
    setTempDate(unlockDate);
    setShowDatePicker(true);
  };

  const openTimePicker = () => {
    setTempTime(unlockDate);
    setShowTimePicker(true);
  };

  // Android: date picker
  const onAndroidDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (event.type === "dismissed" || !selectedDate) return;
    // Preserve existing time
    const updated = new Date(selectedDate);
    updated.setHours(unlockDate.getHours(), unlockDate.getMinutes(), 0, 0);
    setUnlockDate(updated);
  };

  // Android: time picker
  const onAndroidTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (event.type === "dismissed" || !selectedTime) return;
    const updated = new Date(unlockDate);
    updated.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
    setUnlockDate(updated);
  };

  const onIOSDateChange = (_, selectedDate) => {
    if (selectedDate) setTempDate(selectedDate);
  };

  const onIOSTimeChange = (_, selectedTime) => {
    if (selectedTime) setTempTime(selectedTime);
  };

  const confirmIOSTime = () => {
    const updated = new Date(unlockDate);
    updated.setHours(tempTime.getHours(), tempTime.getMinutes(), 0, 0);
    setUnlockDate(updated);
    setShowTimePicker(false);
  };

  const handleAtlasToggle = async (value) => {
    if (!value) {
      setShowInAtlas(false);
      setAtlasLocation(null);
      return;
    }
    setFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location required", "Allow location access to tag this capsule on the Atlas.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      const name = geo
        ? [geo.city || geo.district, geo.region, geo.country].filter(Boolean).join(", ")
        : "Current location";
      setAtlasLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude, name });
      setShowInAtlas(true);
    } catch (_) {
      Alert.alert("Location error", "Could not get your location. Please try again.");
    } finally {
      setFetchingLocation(false);
    }
  };

  const confirmIOSDate = () => {
    setUnlockDate(tempDate);
    setShowDatePicker(false);
  };

  // ── encryption ────────────────────────────────────────────────────────────

  const handleEncryptionType = (value) => {
    setEncryptionType(value);
    if (value === "auto") setPassphraseHint("");
  };

  // ── seal ──────────────────────────────────────────────────────────────────

  const handleSeal = async () => {
    if (!title.trim()) {
      Alert.alert("Missing title", "Please give your capsule a title.");
      return;
    }
    if (!message.trim()) {
      Alert.alert("Message required", "Write a message for your capsule.");
      return;
    }
    if (type === "PHOTO" && photoMode === "photos" && photos.length === 0) {
      Alert.alert("No photos", "Take at least one photo before sealing.");
      return;
    }
    if (type === "PHOTO" && photoMode === "video" && !video) {
      Alert.alert("No video", "Record a video before sealing.");
      return;
    }
    if (type === "VOICE" && !recordedUri) {
      Alert.alert("No recording", "Record a voice note before sealing.");
      return;
    }

    try {
      setSealing(true);

      // Auto-generate passphrase for self-encrypted capsules
      const generatedPassphrase = encryptionType === "self" ? generatePassphrase() : null;

      const capsule = await createCapsule({
        title: title.trim(),
        description: description.trim(),
        unlock_at: unlockDate.toISOString(),
        is_public: isPublic,
        passphrase_hint: passphraseHint.trim(),
        ...(event ? { event_id: event.id } : {}),
        ...(showInAtlas && atlasLocation
          ? {
              latitude: atlasLocation.lat,
              longitude: atlasLocation.lng,
              location_name: atlasLocation.name,
            }
          : {}),
      });

      // Push to vault immediately
      vaultBus.emit(normalizeCapsule(capsule, user?.id));

      // Text is always required and uploaded for every capsule type
      await addCapsuleContent(capsule.id, {
        content_type: "text",
        body: message.trim(),
      });

      // Photo / video uploads
      if (type === "PHOTO") {
        const files = photoMode === "photos" ? photos : [video];
        const contentType = photoMode === "photos" ? "photo" : "video";
        const mimeType = photoMode === "photos" ? "image/jpeg" : "video/mp4";
        for (const uri of files) {
          await addCapsuleContent(capsule.id, {
            content_type: contentType,
            file: { uri, name: uri.split("/").pop(), type: mimeType },
          });
        }
      }

      if (type === "VOICE" && recordedUri) {
        await addCapsuleContent(capsule.id, {
          content_type: "voice",
          file: { uri: recordedUri, name: "voice.m4a", type: "audio/m4a" },
        });
      }

      hapticSuccess();
      if (generatedPassphrase) {
        await storePassphrase(capsule.id, generatedPassphrase);
        setRevealedPassphrase(generatedPassphrase);
      } else {
        navigation.goBack();
      }
    } catch (err) {
      hapticError();
      const msg =
        err?.response?.data?.error || err?.error || "Failed to seal capsule";
      Alert.alert("Error", msg);
    } finally {
      setSealing(false);
    }
  };

  const daysUntil = getDaysUntil(unlockDate);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>{event ? "PARTICIPATE" : "SEAL A MOMENT"}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Event pill (when participating in an event) */}
        {event && (
          <View style={styles.eventPill}>
            <Ionicons name="calendar-outline" size={14} color={colors.primary} />
            <Text style={styles.eventPillText} numberOfLines={1}>
              {event.title}
            </Text>
          </View>
        )}

        {/* Type selector */}
        <TypeSelector activeType={type} onSelect={handleTypeChange} />

        {/* Title */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>CAPSULE TITLE</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="Name this moment..."
            placeholderTextColor={colors.mutedFg}
            value={title}
            onChangeText={setTitle}
            autoCapitalize="sentences"
            accessibilityLabel="Name this moment"
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>DESCRIPTION (OPTIONAL)</Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder="A short teaser visible before this capsule opens..."
            placeholderTextColor={colors.mutedFg}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
            autoCapitalize="sentences"
            maxLength={300}
            accessibilityLabel="A short teaser visible before this capsule opens"
          />
        </View>

        {/* ── Type-specific content ─────────────────────────────────────────── */}

        {/* Message is always required regardless of capsule type */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            {type === "MESSAGE" ? "YOUR MESSAGE" : "ADD A MESSAGE"}
          </Text>
          <TextInput
            style={styles.messageInput}
            placeholder="Hey future me, I hope by the time you read this..."
            placeholderTextColor={colors.mutedFg}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            autoCapitalize="sentences"
            accessibilityLabel="Hey future me, I hope by the time you read this"
          />
        </View>

        {type === "PHOTO" && (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>CAPTURE</Text>
            <PhotoCapture
              photos={photos}
              video={video}
              photoMode={photoMode}
              onPhotosChange={setPhotos}
              onVideoChange={setVideo}
              onModeChange={setPhotoMode}
            />
          </View>
        )}

        {type === "VOICE" && (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>VOICE NOTE</Text>
            <VoiceRecorder
              recordedUri={recordedUri}
              onRecorded={setRecordedUri}
            />
          </View>
        )}

        {/* Unlock Date — hidden when participating in an event (event controls unlock) */}
        {!event && (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>UNLOCK DATE</Text>
          <Pressable onPress={openDatePicker} style={styles.selectRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.mutedFg} />
            <Text style={styles.selectValue}>
              {unlockDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </Text>
            <View style={styles.daysBadge}>
              <Text style={styles.daysBadgeText}>{daysUntil}d</Text>
            </View>
          </Pressable>
        </View>
        )}

        {/* Unlock Time */}
        {!event && (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>UNLOCK TIME</Text>
          <Pressable onPress={openTimePicker} style={styles.selectRow}>
            <Ionicons name="time-outline" size={18} color={colors.mutedFg} />
            <Text style={styles.selectValue}>
              {unlockDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
            </Text>
          </Pressable>
        </View>
        )}

        {/* ── Settings Accordion (Encryption + Visibility + Atlas) ─────────── */}
        <View style={styles.accordionCard}>
          {/* Header */}
          <Pressable
            onPress={() => setSettingsExpanded((v) => !v)}
            style={styles.accordionHeader}
          >
            <View style={styles.accordionHeaderLeft}>
              <Ionicons name="options-outline" size={16} color={colors.mutedFg} />
              <Text style={styles.accordionHeaderLabel}>SETTINGS</Text>
            </View>
            <View style={styles.settingsSummary}>
              <Text style={styles.settingsSummaryText}>
                {encryptionType === "self" ? "Self-enc" : "Auto-enc"} · {isPublic ? "Public" : "Private"}{showInAtlas ? " · Atlas" : ""} · {recipient.label}
              </Text>
            </View>
            <Ionicons
              name={settingsExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={colors.mutedFg}
              style={{ marginLeft: 8 }}
            />
          </Pressable>

          {settingsExpanded && (
            <View style={styles.accordionBody}>
              {/* Encryption */}
              <View style={styles.settingsSection}>
                <View style={styles.settingsSectionHeader}>
                  <Ionicons name="lock-closed-outline" size={14} color={colors.mutedFg} />
                  <Text style={styles.settingsSectionLabel}>ENCRYPTION</Text>
                </View>
                <View style={styles.encToggle}>
                  <Pressable
                    onPress={() => handleEncryptionType("auto")}
                    style={[styles.encToggleBtn, encryptionType === "auto" && styles.encToggleBtnActive]}
                  >
                    <Text style={[styles.encToggleText, encryptionType === "auto" && styles.encToggleTextActive]}>
                      Auto
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleEncryptionType("self")}
                    style={[styles.encToggleBtn, encryptionType === "self" && styles.encToggleBtnActive]}
                  >
                    <Text style={[styles.encToggleText, encryptionType === "self" && styles.encToggleTextActive]}>
                      Self
                    </Text>
                  </Pressable>
                </View>
                {encryptionType === "self" && (
                  <View style={styles.passphraseSection}>
                    <View style={styles.passphraseInfoRow}>
                      <Ionicons name="information-circle-outline" size={14} color={colors.mutedFg} />
                      <Text style={styles.passphraseHintText}>
                        A passphrase will be auto-generated when you seal. You'll see it once — save it somewhere safe.
                      </Text>
                    </View>
                    <TextInput
                      style={styles.passphraseInput}
                      placeholder="Optional hint for the recipient..."
                      placeholderTextColor={colors.mutedFg}
                      value={passphraseHint}
                      onChangeText={setPassphraseHint}
                      autoCapitalize="none"
                      autoCorrect={false}
                      maxLength={200}
                    />
                  </View>
                )}
              </View>

              <View style={styles.settingsDivider} />

              {/* Visibility */}
              <View style={styles.settingsSection}>
                <View style={styles.settingsSectionHeader}>
                  <Ionicons
                    name={isPublic ? "earth-outline" : "lock-closed-outline"}
                    size={14}
                    color={isPublic ? colors.primary : colors.mutedFg}
                  />
                  <Text style={styles.settingsSectionLabel}>VISIBILITY</Text>
                </View>
                <View style={styles.visibilityToggleRow}>
                  {["Private", "Public"].map((opt) => {
                    const active = (opt === "Public") === isPublic;
                    return (
                      <Pressable
                        key={opt}
                        onPress={() => {
                          const pub = opt === "Public";
                          setIsPublic(pub);
                          if (!pub) {
                            setShowInAtlas(false);
                            setAtlasLocation(null);
                          }
                        }}
                        style={[styles.visibilityOpt, active && styles.visibilityOptActive]}
                      >
                        <Text style={[styles.visibilityOptText, active && styles.visibilityOptTextActive]}>
                          {opt}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Atlas (only when public) */}
              {isPublic && (
                <>
                  <View style={styles.settingsDivider} />
                  <View style={styles.settingsSection}>
                    <View style={styles.settingsSectionHeader}>
                      <Ionicons name="map-outline" size={14} color={colors.mutedFg} />
                      <Text style={styles.settingsSectionLabel}>ATLAS LOCATION</Text>
                    </View>
                    <Pressable
                      onPress={() => handleAtlasToggle(!showInAtlas)}
                      disabled={fetchingLocation}
                      style={styles.atlasRow}
                    >
                      <View style={[styles.atlasCheckbox, showInAtlas && styles.atlasCheckboxChecked]}>
                        {showInAtlas && <Ionicons name="checkmark" size={12} color={colors.primaryFg} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.atlasLabel}>Show in Atlas</Text>
                        {showInAtlas && atlasLocation ? (
                          <Text style={styles.atlasLocationName}>{atlasLocation.name}</Text>
                        ) : (
                          <Text style={styles.atlasSubLabel}>Pin this capsule on the world map</Text>
                        )}
                      </View>
                      {fetchingLocation && (
                        <ActivityIndicator size="small" color={colors.primary} />
                      )}
                    </Pressable>
                    {showInAtlas && (
                      <View style={styles.atlasWarning}>
                        <Ionicons name="warning-outline" size={13} color={colors.mutedFg} />
                        <Text style={styles.atlasWarningText}>
                          This capsule will appear on the Atlas and other users will be able to see its content from the location.
                        </Text>
                      </View>
                    )}
                  </View>
                </>
              )}

              {/* Send To */}
              <View style={styles.settingsDivider} />
              <View style={styles.settingsSection}>
                <View style={styles.settingsSectionHeader}>
                  <Ionicons name="paper-plane-outline" size={14} color={colors.mutedFg} />
                  <Text style={styles.settingsSectionLabel}>SEND TO</Text>
                </View>
                <Pressable onPress={() => setShowSendTo(true)} style={styles.sendToInlineRow}>
                  <View style={styles.recipientAvatar}>
                    <Text style={styles.recipientAvatarText}>{recipient.initial}</Text>
                  </View>
                  <Text style={styles.sendToInlineValue}>{recipient.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.mutedFg} />
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Warning */}
        <View style={styles.warningRow}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={colors.mutedFg}
          />
          <Text style={styles.warningText}>
            Once sealed, this cannot be opened early
          </Text>
        </View>

        {/* Seal Button */}
        <Pressable
          onPress={handleSeal}
          disabled={sealing}
          style={styles.sealButton}
          accessibilityRole="button"
          accessibilityLabel="Seal capsule"
        >
          <LinearGradient
            colors={[colors.primary, "#D4924A", colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.sealGradient}
          >
            <Text style={styles.sealButtonText}>
              {sealing ? "SEALING..." : "SEAL THIS MOMENT"}
            </Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Date picker ─────────────────────────────────────────────────────── */}

      {Platform.OS === "android" && showDatePicker && (
        <DateTimePicker
          value={unlockDate}
          mode="date"
          display="default"
          minimumDate={MIN_DATE}
          onChange={onAndroidDateChange}
        />
      )}

      {Platform.OS === "ios" && (
        <Modal visible={showDatePicker} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setShowDatePicker(false)}>
            <Pressable style={styles.iosPickerCard} onPress={() => {}}>
              <View style={styles.iosPickerHeader}>
                <Text style={styles.iosPickerTitle}>UNLOCK DATE</Text>
                <Pressable onPress={confirmIOSDate} style={styles.iosDoneBtn}>
                  <Text style={styles.iosDoneBtnText}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                minimumDate={MIN_DATE}
                onChange={onIOSDateChange}
                themeVariant="dark"
                style={styles.iosPicker}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* ── Time picker ─────────────────────────────────────────────────────── */}

      {Platform.OS === "android" && showTimePicker && (
        <DateTimePicker
          value={unlockDate}
          mode="time"
          display="default"
          onChange={onAndroidTimeChange}
        />
      )}

      {Platform.OS === "ios" && (
        <Modal visible={showTimePicker} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setShowTimePicker(false)}>
            <Pressable style={styles.iosPickerCard} onPress={() => {}}>
              <View style={styles.iosPickerHeader}>
                <Text style={styles.iosPickerTitle}>UNLOCK TIME</Text>
                <Pressable onPress={confirmIOSTime} style={styles.iosDoneBtn}>
                  <Text style={styles.iosDoneBtnText}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={tempTime}
                mode="time"
                display="spinner"
                onChange={onIOSTimeChange}
                themeVariant="dark"
                style={styles.iosPicker}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* ── Passphrase Reveal Modal ──────────────────────────────────────────── */}

      <Modal visible={!!revealedPassphrase} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.revealCard}>
            <View style={styles.revealIconRow}>
              <Ionicons name="key" size={28} color={colors.primary} />
            </View>
            <Text style={styles.revealTitle}>Your Passphrase</Text>
            <Text style={styles.revealSubtitle}>
              Save this now — it will not be shown again. You'll need it to open the capsule.
            </Text>
            <View style={styles.revealPassphraseBox}>
              <Text style={styles.revealPassphraseText} selectable>
                {revealedPassphrase}
              </Text>
            </View>
            <Text style={styles.revealTTL}>Stored locally on this device for 7 days.</Text>
            <View style={styles.revealActions}>
              <Pressable
                style={styles.revealShareBtn}
                onPress={() =>
                  Share.share({ message: `Your capsule passphrase: ${revealedPassphrase}` })
                }
              >
                <Ionicons name="share-outline" size={16} color={colors.primary} />
                <Text style={styles.revealShareText}>Share / Save</Text>
              </Pressable>
              <Pressable
                style={styles.revealDoneBtn}
                onPress={() => {
                  setRevealedPassphrase(null);
                  navigation.goBack();
                }}
              >
                <Text style={styles.revealDoneText}>I'VE SAVED IT</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Send To modal */}
      <SendToModal
        visible={showSendTo}
        recipient={recipient}
        onSelect={setRecipient}
        onDismiss={() => setShowSendTo(false)}
      />
    </SafeAreaView>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  eventPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 7,
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${colors.primary}35`,
  },
  eventPillText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "600",
    maxWidth: 220,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.foreground,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  content: {
    padding: 20,
    gap: 20,
    paddingBottom: 40,
  },

  // ── type selector
  typeRow: {
    flexDirection: "row",
    gap: 10,
  },
  typeCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeLabel: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.mutedFg,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  typeLabelActive: {
    color: colors.primaryFg,
  },

  // ── fields
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.mutedFg,
    letterSpacing: 1.5,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  titleInput: {
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.foreground,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  descriptionInput: {
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.foreground,
    fontSize: 14,
    lineHeight: 21,
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageInput: {
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.foreground,
    fontSize: 14,
    lineHeight: 22,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recipientAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.secondaryBackground,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
  },
  recipientAvatarText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    color: colors.foreground,
  },
  selectValue: {
    flex: 1,
    fontSize: 15,
    color: colors.foreground,
  },
  daysBadge: {
    backgroundColor: `${colors.primary}18`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  daysBadgeText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.primary,
    fontWeight: "600",
  },

  // ── photo capture
  captureContainer: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  modeToggle: {
    flexDirection: "row",
    padding: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modeBtnActive: {
    backgroundColor: colors.primary,
  },
  modeBtnText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedFg,
    fontWeight: "500",
  },
  modeBtnTextActive: {
    color: colors.primaryFg,
    fontWeight: "700",
  },
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 12,
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  photoThumbImg: {
    width: "100%",
    height: "100%",
  },
  photoRemoveBtn: {
    position: "absolute",
    top: 4,
    right: 4,
  },
  cameraAddBtn: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: colors.secondaryBackground,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  cameraAddText: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.mutedFg,
    fontWeight: "500",
    textAlign: "center",
  },
  maxReachedBadge: {
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  maxReachedText: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.mutedFg,
  },
  videoRecordBtn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 24,
  },
  videoPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  videoPreviewText: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
  },
  videoRemoveBtn: {
    padding: 8,
  },
  videoHint: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.mutedFg,
    letterSpacing: 0.5,
  },

  // ── voice recorder
  voiceContainer: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    padding: 24,
    gap: 16,
  },
  voiceTimerRing: {
    alignItems: "center",
    gap: 2,
  },
  voiceTimerFill: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.primary}18`,
  },
  voiceTimerText: {
    fontSize: 28,
    fontWeight: "200",
    color: colors.foreground,
    letterSpacing: 2,
  },
  voiceTimerMax: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.mutedFg,
  },
  voiceProgressBar: {
    width: "100%",
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  voiceProgressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  recordBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  recordBtnActive: {
    backgroundColor: colors.errorStrong,
    shadowColor: colors.errorStrong,
  },
  voiceHint: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedFg,
  },
  voicePlayback: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  voicePlaybackLabel: {
    fontSize: 14,
    color: colors.foreground,
    fontWeight: "500",
  },
  voicePlaybackSub: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedFg,
    marginTop: 2,
  },
  discardBtn: {
    padding: 8,
  },

  // ── encryption accordion
  accordionCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  accordionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  accordionHeaderLabel: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.mutedFg,
    letterSpacing: 1.5,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  encToggle: {
    flexDirection: "row",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 8,
    padding: 2,
    alignSelf: "flex-start",
  },
  encToggleBtn: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: "center",
  },
  encToggleBtnActive: {
    backgroundColor: colors.primary,
  },
  encToggleText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedFg,
    fontWeight: "500",
  },
  encToggleTextActive: {
    color: colors.primaryFg,
    fontWeight: "700",
  },
  accordionBody: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  passphraseHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  passphraseHintText: {
    fontSize: 12,
    color: colors.mutedFg,
    lineHeight: 18,
    flex: 1,
  },
  passphraseInput: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.foreground,
    fontSize: 14,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    letterSpacing: 2,
  },

  // ── visibility (kept for use inside accordion)
  visibilityToggleRow: {
    flexDirection: "row",
    gap: 8,
  },
  visibilityOpt: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.secondaryBackground,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  visibilityOptActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  visibilityOptText: {
    fontSize: 13,
    color: colors.mutedFg,
    fontWeight: "500",
  },
  visibilityOptTextActive: {
    color: colors.primaryFg,
    fontWeight: "700",
  },
  // ── settings accordion internals
  settingsSummary: {
    flex: 1,
    alignItems: "flex-end",
    marginRight: 4,
  },
  settingsSummaryText: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.mutedFg,
  },
  settingsSection: {
    gap: 10,
  },
  settingsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  settingsSectionLabel: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.mutedFg,
    letterSpacing: 1.5,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  settingsDivider: {
    height: 16,
  },
  passphraseSection: {
    gap: 8,
  },
  // ── atlas
  atlasRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  atlasCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.secondaryBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  atlasCheckboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  atlasLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.foreground,
  },
  atlasSubLabel: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedFg,
    marginTop: 2,
  },
  atlasLocationName: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.primary,
    marginTop: 2,
  },
  atlasWarning: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: `${colors.mutedFg}15`,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  atlasWarningText: {
    flex: 1,
    fontSize: 12,
    color: colors.mutedFg,
    lineHeight: 18,
  },

  // ── warning + seal
  warningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  warningText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedFg,
  },
  sealButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    marginTop: 4,
  },
  sealGradient: {
    paddingVertical: 18,
    alignItems: "center",
  },
  sealButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primaryFg,
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  // ── modal shared
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  // ── iOS native date picker
  iosPickerCard: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  iosPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iosPickerTitle: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.mutedFg,
    letterSpacing: 2,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  iosDoneBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  iosDoneBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primaryFg,
  },
  iosPicker: {
    height: 200,
  },

  // ── send to modal
  sendToCard: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: "80%",
  },
  sendToTitle: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.mutedFg,
    letterSpacing: 2,
    fontWeight: "600",
    textTransform: "uppercase",
    textAlign: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sendToOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  sendToOptionActive: {
    backgroundColor: `${colors.primary}08`,
  },
  sendToOptionSub: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.mutedFg,
    marginTop: 1,
  },
  sendToAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondaryBackground,
    borderWidth: 1.5,
    borderColor: `${colors.primary}40`,
    alignItems: "center",
    justifyContent: "center",
  },
  sendToAvatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.foreground,
  },
  sendToOptionLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.foreground,
  },
  sendToDivider: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  sendToDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  sendToDividerText: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.mutedFg,
    letterSpacing: 0.5,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    color: colors.foreground,
    fontSize: 14,
    padding: 0,
  },
  resultsList: {
    maxHeight: 200,
  },
  noResults: {
    alignItems: "center",
    paddingVertical: 16,
  },
  noResultsText: {
    fontSize: 13,
    color: colors.mutedFg,
  },

  // ── passphrase info row (inside encryption section)
  passphraseInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },

  // ── send-to inline row (inside accordion)
  sendToInlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.secondaryBackground,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendToInlineValue: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
  },

  // ── passphrase reveal modal
  revealCard: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    gap: 14,
  },
  revealIconRow: {
    alignItems: "center",
    marginBottom: 4,
  },
  revealTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.foreground,
    textAlign: "center",
  },
  revealSubtitle: {
    fontSize: 13,
    color: colors.mutedFg,
    textAlign: "center",
    lineHeight: 20,
  },
  revealPassphraseBox: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  revealPassphraseText: {
    fontSize: 22,
    fontWeight: "300",
    color: colors.primary,
    letterSpacing: 1.5,
    textAlign: "center",
  },
  revealTTL: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.mutedFg,
    textAlign: "center",
  },
  revealActions: {
    gap: 10,
    marginTop: 4,
  },
  revealShareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  revealShareText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  revealDoneBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  revealDoneText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primaryFg,
    letterSpacing: 1.5,
  },
});
