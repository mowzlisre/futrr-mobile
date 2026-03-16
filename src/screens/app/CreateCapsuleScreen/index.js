import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
  Modal,
  Platform,
  Alert,
  Image,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useState, useRef, useEffect, useCallback } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/constants";
import { getDaysUntil } from "@/utils/date";
import { createCapsule, addCapsuleContent } from "@/services/capsules";
import { searchUsers } from "@/services/user";

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

function formatDisplayDate(date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatSeconds(secs) {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ─── TypeSelector ─────────────────────────────────────────────────────────────

function TypeSelector({ activeType, onSelect }) {
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
      allowsEditing: false,
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
      allowsEditing: false,
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
  const [recording, setRecording] = useState(null);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const soundRef = useRef(null);
  const timerRef = useRef(null);

  // Auto-stop at 60s
  useEffect(() => {
    if (recording && duration >= MAX_VOICE_SECS) {
      stopRecording();
    }
  }, [duration, recording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      soundRef.current?.unloadAsync();
    };
  }, []);

  const startRecording = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Microphone access is needed to record audio.");
      return;
    }
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
    const { recording: rec } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    setRecording(rec);
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
  };

  const stopRecording = async () => {
    clearInterval(timerRef.current);
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    const uri = recording.getURI();
    setRecording(null);
    onRecorded(uri);
  };

  const playback = async () => {
    if (!recordedUri) return;
    if (playing) {
      await soundRef.current?.stopAsync();
      setPlaying(false);
      return;
    }
    const { sound } = await Audio.Sound.createAsync({ uri: recordedUri });
    soundRef.current = sound;
    setPlaying(true);
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) setPlaying(false);
    });
  };

  const discard = () => {
    soundRef.current?.unloadAsync();
    setPlaying(false);
    setDuration(0);
    onRecorded(null);
  };

  const isRecording = !!recording;
  const progress = Math.min(duration / MAX_VOICE_SECS, 1);

  return (
    <View style={styles.voiceContainer}>
      {!recordedUri ? (
        <>
          {/* Timer ring */}
          <View style={styles.voiceTimerRing}>
            <View
              style={[
                styles.voiceTimerFill,
                { opacity: isRecording ? 1 : 0.3 },
              ]}
            />
            <Text style={styles.voiceTimerText}>
              {isRecording ? formatSeconds(duration) : "00:00"}
            </Text>
            <Text style={styles.voiceTimerMax}>/ 01:00</Text>
          </View>

          {/* Progress bar */}
          {isRecording && (
            <View style={styles.voiceProgressBar}>
              <View
                style={[styles.voiceProgressFill, { width: `${progress * 100}%` }]}
              />
            </View>
          )}

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
          <View style={{ flex: 1 }}>
            <Text style={styles.voicePlaybackLabel}>Voice note recorded</Text>
            <Text style={styles.voicePlaybackSub}>
              {formatSeconds(duration)} · Tap to preview
            </Text>
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
  const navigation = useNavigation();

  // Form state
  const [type, setType] = useState("MESSAGE");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [unlockDate, setUnlockDate] = useState(DEFAULT_DATE);
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

  // Native date picker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(DEFAULT_DATE);

  // Visibility
  const [isPublic, setIsPublic] = useState(false);

  // Encryption accordion
  const [encryptionType, setEncryptionType] = useState("auto");
  const [encryptionExpanded, setEncryptionExpanded] = useState(false);
  const [passphrase, setPassphrase] = useState("");

  // Modals
  const [showSendTo, setShowSendTo] = useState(false);

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

  const onAndroidDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (event.type !== "dismissed" && selectedDate) setUnlockDate(selectedDate);
  };

  const onIOSDateChange = (_, selectedDate) => {
    if (selectedDate) setTempDate(selectedDate);
  };

  const confirmIOSDate = () => {
    setUnlockDate(tempDate);
    setShowDatePicker(false);
  };

  // ── encryption ────────────────────────────────────────────────────────────

  const handleEncryptionType = (value) => {
    setEncryptionType(value);
    setEncryptionExpanded(value === "self");
    if (value === "auto") setPassphrase("");
  };

  // ── seal ──────────────────────────────────────────────────────────────────

  const handleSeal = async () => {
    if (!title.trim()) {
      Alert.alert("Missing title", "Please give your capsule a title.");
      return;
    }
    if (encryptionType === "self" && !passphrase.trim()) {
      Alert.alert("Passphrase required", "Enter a passphrase for self-encryption.");
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
      const capsule = await createCapsule({
        title: title.trim(),
        unlock_at: unlockDate.toISOString(),
        is_public: isPublic,
      });

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

      Alert.alert("Sealed!", "Your capsule has been sealed.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
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
        <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>SEAL A MOMENT</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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

        {/* Send To */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>SEND TO</Text>
          <Pressable onPress={() => setShowSendTo(true)} style={styles.selectRow}>
            <View style={styles.recipientAvatar}>
              <Text style={styles.recipientAvatarText}>{recipient.initial}</Text>
            </View>
            <Text style={styles.selectValue}>{recipient.label}</Text>
            <Ionicons name="chevron-down" size={18} color={colors.mutedFg} />
          </Pressable>
        </View>

        {/* Unlock Date */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>UNLOCK DATE</Text>
          <Pressable onPress={openDatePicker} style={styles.selectRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.mutedFg} />
            <Text style={styles.selectValue}>{formatDisplayDate(unlockDate)}</Text>
            <View style={styles.daysBadge}>
              <Text style={styles.daysBadgeText}>{daysUntil}d</Text>
            </View>
          </Pressable>
        </View>

        {/* ── Encryption Accordion ─────────────────────────────────────────── */}
        <View style={styles.accordionCard}>
          <Pressable
            onPress={() => {
              if (encryptionType === "self") setEncryptionExpanded((v) => !v);
            }}
            style={styles.accordionHeader}
          >
            <View style={styles.accordionHeaderLeft}>
              <Ionicons
                name="lock-closed-outline"
                size={16}
                color={colors.mutedFg}
              />
              <Text style={styles.accordionHeaderLabel}>ENCRYPTION</Text>
            </View>

            <View style={styles.encToggle}>
              <Pressable
                onPress={() => handleEncryptionType("auto")}
                style={[
                  styles.encToggleBtn,
                  encryptionType === "auto" && styles.encToggleBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.encToggleText,
                    encryptionType === "auto" && styles.encToggleTextActive,
                  ]}
                >
                  Auto
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleEncryptionType("self")}
                style={[
                  styles.encToggleBtn,
                  encryptionType === "self" && styles.encToggleBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.encToggleText,
                    encryptionType === "self" && styles.encToggleTextActive,
                  ]}
                >
                  Self
                </Text>
              </Pressable>
            </View>

            {encryptionType === "self" && (
              <Ionicons
                name={encryptionExpanded ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.mutedFg}
                style={{ marginLeft: 8 }}
              />
            )}
          </Pressable>

          {encryptionType === "self" && encryptionExpanded && (
            <View style={styles.accordionBody}>
              <View style={styles.passphraseHint}>
                <Ionicons
                  name="information-circle-outline"
                  size={14}
                  color={colors.mutedFg}
                />
                <Text style={styles.passphraseHintText}>
                  Your passphrase will be required to open this capsule.
                </Text>
              </View>
              <TextInput
                style={styles.passphraseInput}
                placeholder="Enter passphrase..."
                placeholderTextColor={colors.mutedFg}
                value={passphrase}
                onChangeText={setPassphrase}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}
        </View>

        {/* Visibility */}
        <View style={styles.visibilityRow}>
          <View style={styles.visibilityLeft}>
            <Ionicons
              name={isPublic ? "earth-outline" : "lock-closed-outline"}
              size={18}
              color={isPublic ? colors.primary : colors.mutedFg}
            />
            <View>
              <Text style={styles.visibilityLabel}>
                {isPublic ? "Public" : "Private"}
              </Text>
              <Text style={styles.visibilityDesc}>
                {isPublic
                  ? "Anyone can discover this capsule"
                  : "Only you and recipients can see this"}
              </Text>
            </View>
          </View>
          <View style={styles.visibilityToggleRow}>
            {["Private", "Public"].map((opt) => {
              const active = (opt === "Public") === isPublic;
              return (
                <Pressable
                  key={opt}
                  onPress={() => setIsPublic(opt === "Public")}
                  style={[styles.visibilityOpt, active && styles.visibilityOptActive]}
                >
                  <Text
                    style={[
                      styles.visibilityOptText,
                      active && styles.visibilityOptTextActive,
                    ]}
                  >
                    {opt}
                  </Text>
                </Pressable>
              );
            })}
          </View>
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

      {/* ── Native date picker ───────────────────────────────────────────────── */}

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
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowDatePicker(false)}
          >
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: "#c0392b",
    shadowColor: "#c0392b",
  },
  voiceHint: {
    fontSize: 12,
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
  },
  encToggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 6,
  },
  encToggleBtnActive: {
    backgroundColor: colors.primary,
  },
  encToggleText: {
    fontSize: 12,
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

  // ── visibility
  visibilityRow: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    marginBottom: 12,
  },
  visibilityLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  visibilityLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.foreground,
  },
  visibilityDesc: {
    fontSize: 11,
    color: colors.mutedFg,
    marginTop: 2,
  },
  visibilityToggleRow: {
    flexDirection: "row",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  visibilityOpt: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: "center",
  },
  visibilityOptActive: {
    backgroundColor: colors.primary,
  },
  visibilityOptText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.mutedFg,
  },
  visibilityOptTextActive: {
    color: colors.primaryFg,
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
});
