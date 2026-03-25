import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  Image,
} from "react-native";
import { useState, useRef, useCallback, useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/constants";
import { useTheme } from "@/hooks/useTheme";
import { hapticSuccess } from "@/utils/haptics";
import { eventBus } from "@/utils/eventBus";
import { createEvent, checkEventSlug } from "@/services/events";
import { useAuth } from "@/hooks/useAuth";

// ─── Event type options ────────────────────────────────────────────────────────

const EVENT_TYPES = [
  { id: "birthday",    label: "Birthday",    icon: "balloon-outline" },
  { id: "wedding",     label: "Wedding",     icon: "heart-outline" },
  { id: "graduation",  label: "Graduation",  icon: "school-outline" },
  { id: "anniversary", label: "Anniversary", icon: "ribbon-outline" },
  { id: "new_year",    label: "New Year",    icon: "sparkles-outline" },
  { id: "sports",      label: "Sports",      icon: "football-outline" },
  { id: "travel",      label: "Travel",      icon: "airplane-outline" },
  { id: "festival",    label: "Festival",    icon: "bonfire-outline" },
  { id: "music",       label: "Music",       icon: "musical-notes-outline" },
  { id: "memorial",    label: "Memorial",    icon: "flower-outline" },
  { id: "reunion",     label: "Reunion",     icon: "people-outline" },
  { id: "other",       label: "Other",       icon: "ellipsis-horizontal-circle-outline" },
];

const CONTENT_TYPES = [
  { id: "text",  label: "Text",  icon: "document-text-outline" },
  { id: "photo", label: "Photo", icon: "image-outline" },
  { id: "video", label: "Video", icon: "videocam-outline" },
  { id: "voice", label: "Voice", icon: "mic-outline" },
];

// ─── Constants ─────────────────────────────────────────────────────────────────

const MIN_DATE = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
})();

const DEFAULT_UNLOCK = new Date("2026-12-25");
const DEFAULT_ENTRY_CLOSE = new Date("2026-12-20");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d) {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatDateTime(d) {
  return `${formatDate(d)} at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
}

// ─── Date picker modal (iOS) ──────────────────────────────────────────────────

function IOSPickerModal({ visible, title, value, mode, minimumDate, onChange, onConfirm, onDismiss }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={onDismiss}>
        <Pressable style={styles.iosPickerCard} onPress={() => {}}>
          <View style={styles.iosPickerHeader}>
            <Text style={styles.iosPickerTitle}>{title}</Text>
            <Pressable onPress={onConfirm} style={styles.iosDoneBtn}>
              <Text style={styles.iosDoneBtnText}>Done</Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={value}
            mode={mode}
            display="spinner"
            minimumDate={minimumDate}
            onChange={onChange}
            themeVariant="dark"
            style={styles.iosPicker}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── DateRow: a pressable row that opens a date/time picker ──────────────────

function DateRow({ label, value, onPress, icon = "calendar-outline" }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable onPress={onPress} style={styles.selectRow}>
      <Ionicons name={icon} size={18} color={colors.mutedFg} />
      <Text style={styles.selectLabel}>{label}</Text>
      <Text style={styles.selectValue}>{value}</Text>
      <Ionicons name="chevron-forward" size={14} color={colors.mutedFg} />
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CreateEventScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation();
  const { user } = useAuth();

  // ── Core fields ──────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");

  // ── Event type ────────────────────────────────────────────────────────────
  const [eventType, setEventType] = useState("other");
  // Custom label the user can edit after selecting a type
  const [typeLabel, setTypeLabel] = useState("Other");
  const [editingLabel, setEditingLabel] = useState(false);

  // ── Entry window ─────────────────────────────────────────────────────────
  const [entryStart, setEntryStart] = useState(new Date());
  const [entryClose, setEntryClose] = useState(DEFAULT_ENTRY_CLOSE);

  // ── Time-lock ─────────────────────────────────────────────────────────────
  const [isTimeLocked, setIsTimeLocked] = useState(true);
  const [unlockDate, setUnlockDate] = useState(DEFAULT_UNLOCK);

  // ── Visibility & participants ─────────────────────────────────────────────
  const [isPublic, setIsPublic] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState("");

  // ── Allowed content types ─────────────────────────────────────────────────
  const [allowedTypes, setAllowedTypes] = useState(["text", "photo", "video", "voice"]);

  // ── Banner image ─────────────────────────────────────────────────────────
  const [bannerUri, setBannerUri] = useState(null);

  // ── Custom URL slug ─────────────────────────────────────────────────────
  const [slugInput, setSlugInput] = useState("");
  const [slugStatus, setSlugStatus] = useState(null); // null | "checking" | "available" | "taken"
  const slugTimer = useRef(null);

  const handleSlugChange = useCallback((text) => {
    const cleaned = text.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    setSlugInput(cleaned);
    clearTimeout(slugTimer.current);
    if (!cleaned || cleaned === "-") {
      setSlugStatus(null);
      return;
    }
    setSlugStatus("checking");
    slugTimer.current = setTimeout(async () => {
      try {
        const res = await checkEventSlug(cleaned);
        setSlugStatus(res.available ? "available" : "taken");
      } catch (_) {
        setSlugStatus(null);
      }
    }, 500);
  }, []);

  // ── Submit state ─────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);

  // ── Date picker state ─────────────────────────────────────────────────────
  // activePicker: { field, mode, title, minimumDate } | null
  const [activePicker, setActivePicker] = useState(null);
  const [tempPickerVal, setTempPickerVal] = useState(new Date());

  // ── Picker helpers ────────────────────────────────────────────────────────

  const openPicker = (field, mode, title, currentVal, minimumDate) => {
    setTempPickerVal(new Date(currentVal));
    setActivePicker({ field, mode, title, minimumDate: minimumDate || MIN_DATE });
  };

  const confirmPicker = () => {
    if (!activePicker) return;
    const { field } = activePicker;
    if (field === "entryStart") setEntryStart(tempPickerVal);
    else if (field === "entryCloseDate") {
      const updated = new Date(entryClose);
      updated.setFullYear(tempPickerVal.getFullYear(), tempPickerVal.getMonth(), tempPickerVal.getDate());
      setEntryClose(updated);
    } else if (field === "entryCloseTime") {
      const updated = new Date(entryClose);
      updated.setHours(tempPickerVal.getHours(), tempPickerVal.getMinutes(), 0, 0);
      setEntryClose(updated);
    } else if (field === "unlockDate") {
      const updated = new Date(unlockDate);
      updated.setFullYear(tempPickerVal.getFullYear(), tempPickerVal.getMonth(), tempPickerVal.getDate());
      setUnlockDate(updated);
    } else if (field === "unlockTime") {
      const updated = new Date(unlockDate);
      updated.setHours(tempPickerVal.getHours(), tempPickerVal.getMinutes(), 0, 0);
      setUnlockDate(updated);
    }
    setActivePicker(null);
  };

  const handleAndroidChange = (field, event, selectedDate) => {
    if (event.type === "dismissed" || !selectedDate) return;
    if (field === "entryStart") setEntryStart(selectedDate);
    else if (field === "entryCloseDate") {
      const updated = new Date(entryClose);
      updated.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setEntryClose(updated);
    } else if (field === "entryCloseTime") {
      const updated = new Date(entryClose);
      updated.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
      setEntryClose(updated);
    } else if (field === "unlockDate") {
      const updated = new Date(unlockDate);
      updated.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setUnlockDate(updated);
    } else if (field === "unlockTime") {
      const updated = new Date(unlockDate);
      updated.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
      setUnlockDate(updated);
    }
  };

  // ── Banner image picker ──────────────────────────────────────────────────

  const pickBanner = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.85,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (!result.canceled && result.assets?.[0]) {
      setBannerUri(result.assets[0].uri);
    }
  };

  // ── Type select ───────────────────────────────────────────────────────────

  const handleTypeSelect = (t) => {
    setEventType(t.id);
    setTypeLabel(t.label);
    setEditingLabel(false);
  };

  // ── Content types toggle ─────────────────────────────────────────────────

  const toggleContentType = (id) => {
    setAllowedTypes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert("Missing title", "Please give your event a title.");
      return;
    }
    if (allowedTypes.length === 0) {
      Alert.alert("No content types", "Select at least one allowed content type.");
      return;
    }
    if (isTimeLocked && unlockDate <= entryClose) {
      Alert.alert("Invalid dates", "Unlock date must be after the entry close date.");
      return;
    }

    try {
      setLoading(true);
      const slug = slugInput.replace(/^-+|-+$/g, "");
      const createdEvent = await createEvent({
        title: title.trim(),
        subtitle: subtitle.trim(),
        description: description.trim(),
        ...(slug ? { slug } : {}),
        event_type: eventType,
        event_type_label: typeLabel.trim(),
        is_time_locked: isTimeLocked,
        unlock_at: isTimeLocked ? unlockDate.toISOString() : null,
        entry_start: entryStart.toISOString(),
        entry_close: entryClose.toISOString(),
        is_public: isPublic,
        max_participants: maxParticipants ? parseInt(maxParticipants, 10) : null,
        allowed_content_types: allowedTypes,
      }, bannerUri);
      eventBus.emit(createdEvent);
      hapticSuccess();
      Alert.alert("Event created!", "Your event has been created.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Failed to create event";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Android pickers rendered outside ScrollView ───────────────────────────
  const renderAndroidPicker = () => {
    if (Platform.OS !== "android" || !activePicker) return null;
    const currentVal =
      activePicker.field === "entryStart" ? entryStart :
      activePicker.field.startsWith("entryClose") ? entryClose :
      unlockDate;
    return (
      <DateTimePicker
        value={currentVal}
        mode={activePicker.mode}
        display="default"
        minimumDate={activePicker.minimumDate}
        onChange={(e, d) => {
          setActivePicker(null);
          handleAndroidChange(activePicker.field, e, d);
        }}
      />
    );
  };

  const selectedType = EVENT_TYPES.find((t) => t.id === eventType);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>CREATE EVENT</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Banner image ───────────────────────────────────────────────── */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>BANNER IMAGE (OPTIONAL)</Text>
          <Pressable onPress={pickBanner} style={styles.bannerPicker}>
            {bannerUri ? (
              <Image source={{ uri: bannerUri }} style={styles.bannerPreview} />
            ) : (
              <View style={styles.bannerPlaceholder}>
                <Ionicons name="image-outline" size={28} color={colors.mutedFg} />
                <Text style={styles.bannerPlaceholderText}>Tap to add a cover image</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* ── Title ─────────────────────────────────────────────────────── */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>EVENT TITLE</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="Name this event..."
            placeholderTextColor={colors.mutedFg}
            value={title}
            onChangeText={setTitle}
            autoCapitalize="sentences"
          />
        </View>

        {/* ── Subtitle ──────────────────────────────────────────────────── */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>SUBTITLE (OPTIONAL)</Text>
          <TextInput
            style={styles.subtitleInput}
            placeholder="A short tagline for this event..."
            placeholderTextColor={colors.mutedFg}
            value={subtitle}
            onChangeText={setSubtitle}
            autoCapitalize="sentences"
          />
        </View>

        {/* ── Description ───────────────────────────────────────────────── */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>DESCRIPTION (OPTIONAL)</Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Describe what this event is about..."
            placeholderTextColor={colors.mutedFg}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            autoCapitalize="sentences"
          />
        </View>

        {/* ── Custom URL ──────────────────────────────────────────────── */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>CUSTOM URL (OPTIONAL)</Text>
          <TextInput
            style={styles.subtitleInput}
            placeholder="e.g. class-of-2025-gwu"
            placeholderTextColor={colors.mutedFg}
            value={slugInput}
            onChangeText={handleSlugChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {slugInput.replace(/^-+|-+$/g, "").length > 0 && (
            <View style={styles.slugPreview}>
              <Text style={styles.slugUrl}>
                https://futrr.app/events/{slugInput.replace(/^-+|-+$/g, "")}
              </Text>
              {slugStatus === "checking" && (
                <ActivityIndicator size="small" color={colors.mutedFg} style={{ marginLeft: 8 }} />
              )}
              {slugStatus === "available" && (
                <View style={styles.slugBadgeAvailable}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={styles.slugBadgeText}>Available</Text>
                </View>
              )}
              {slugStatus === "taken" && (
                <View style={styles.slugBadgeTaken}>
                  <Ionicons name="close-circle" size={14} color={colors.error} />
                  <Text style={[styles.slugBadgeText, { color: colors.error }]}>Taken</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Event type ────────────────────────────────────────────────── */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>EVENT TYPE</Text>
          <View style={styles.typeGrid}>
            {EVENT_TYPES.map((t) => {
              const active = eventType === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => handleTypeSelect(t)}
                  style={[styles.typeCell, active && styles.typeCellActive]}
                >
                  <Ionicons
                    name={t.icon}
                    size={22}
                    color={active ? colors.primaryFg : colors.mutedFg}
                  />
                  <Text style={[styles.typeCellLabel, active && styles.typeCellLabelActive]}>
                    {active ? typeLabel : t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Editable label for selected type */}
          <View style={styles.typeLabelRow}>
            <View style={[styles.typeLabelIconWrap, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name={selectedType?.icon || "ellipsis-horizontal-circle-outline"} size={16} color={colors.primary} />
            </View>
            {editingLabel ? (
              <TextInput
                style={styles.typeLabelInput}
                value={typeLabel}
                onChangeText={setTypeLabel}
                onBlur={() => setEditingLabel(false)}
                autoFocus
                autoCapitalize="words"
                maxLength={50}
                returnKeyType="done"
                onSubmitEditing={() => setEditingLabel(false)}
              />
            ) : (
              <Pressable style={styles.typeLabelPressable} onPress={() => setEditingLabel(true)}>
                <Text style={styles.typeLabelText}>{typeLabel}</Text>
                <Ionicons name="pencil-outline" size={13} color={colors.mutedFg} style={{ marginLeft: 6 }} />
              </Pressable>
            )}
          </View>
        </View>

        {/* ── Entry window ──────────────────────────────────────────────── */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>ENTRY WINDOW</Text>
          <View style={styles.dateCard}>
            <DateRow
              label="Opens"
              value={formatDate(entryStart)}
              onPress={() => openPicker("entryStart", "date", "ENTRY OPENS", entryStart, new Date())}
            />
            <View style={styles.dateDivider} />
            <DateRow
              label="Closes on"
              value={formatDate(entryClose)}
              onPress={() => openPicker("entryCloseDate", "date", "ENTRY CLOSES", entryClose, entryStart)}
            />
            <View style={styles.dateDivider} />
            <DateRow
              label="Closes at"
              value={entryClose.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
              icon="time-outline"
              onPress={() => openPicker("entryCloseTime", "time", "CLOSE TIME", entryClose)}
            />
          </View>
        </View>

        {/* ── Time-lock ─────────────────────────────────────────────────── */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>CAPSULE LOCK MODE</Text>
          <View style={styles.toggleCard}>
            {/* Mode toggle buttons */}
            <View style={styles.lockModeRow}>
              <Pressable
                onPress={() => setIsTimeLocked(true)}
                style={[styles.lockModeBtn, isTimeLocked && styles.lockModeBtnActive]}
              >
                <Ionicons name="lock-closed-outline" size={16} color={isTimeLocked ? colors.primaryFg : colors.mutedFg} />
                <Text style={[styles.lockModeBtnText, isTimeLocked && styles.lockModeBtnTextActive]}>Time-Locked</Text>
              </Pressable>
              <Pressable
                onPress={() => setIsTimeLocked(false)}
                style={[styles.lockModeBtn, !isTimeLocked && styles.lockModeBtnActive]}
              >
                <Ionicons name="lock-open-outline" size={16} color={!isTimeLocked ? colors.primaryFg : colors.mutedFg} />
                <Text style={[styles.lockModeBtnText, !isTimeLocked && styles.lockModeBtnTextActive]}>Open</Text>
              </Pressable>
            </View>
            <Text style={styles.lockModeHint}>
              {isTimeLocked
                ? "Capsules are sealed until the unlock date"
                : "Participants can open capsules anytime after submitting"}
            </Text>

            {/* Unlock date — only shown when time-locked */}
            {isTimeLocked && (
              <View style={styles.unlockDateSection}>
                <View style={styles.dateDivider} />
                <DateRow
                  label="Unlock date"
                  value={formatDate(unlockDate)}
                  onPress={() => openPicker("unlockDate", "date", "UNLOCK DATE", unlockDate, entryClose)}
                />
                <View style={styles.dateDivider} />
                <DateRow
                  label="Unlock time"
                  value={unlockDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                  icon="time-outline"
                  onPress={() => openPicker("unlockTime", "time", "UNLOCK TIME", unlockDate)}
                />
              </View>
            )}
          </View>
        </View>

        {/* ── Visibility ────────────────────────────────────────────────── */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>VISIBILITY</Text>
          <View style={styles.toggleCard}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Ionicons
                  name={isPublic ? "earth-outline" : "lock-closed-outline"}
                  size={18}
                  color={isPublic ? colors.primary : colors.mutedFg}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>{isPublic ? "Public" : "Private"}</Text>
                  <Text style={styles.toggleSub}>
                    {isPublic
                      ? "Anyone can find this event — also shown on Atlas"
                      : "Only people with an invite link can join"}
                  </Text>
                </View>
              </View>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ false: colors.border, true: `${colors.primary}88` }}
                thumbColor={isPublic ? colors.primary : colors.mutedFg}
              />
            </View>
          </View>
        </View>

        {/* ── Event size ────────────────────────────────────────────────── */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>EVENT SIZE (OPTIONAL)</Text>
          <View style={styles.sizeRow}>
            <Ionicons name="people-outline" size={18} color={colors.mutedFg} />
            <TextInput
              style={styles.sizeInput}
              placeholder="Max participants (leave blank for unlimited)"
              placeholderTextColor={colors.mutedFg}
              value={maxParticipants}
              onChangeText={(v) => setMaxParticipants(v.replace(/[^0-9]/g, ""))}
              keyboardType="numeric"
              returnKeyType="done"
            />
          </View>
        </View>

        {/* ── Allowed content types ─────────────────────────────────────── */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>ALLOWED CONTENT TYPES</Text>
          <View style={styles.contentTypeRow}>
            {CONTENT_TYPES.map((ct) => {
              const active = allowedTypes.includes(ct.id);
              return (
                <Pressable
                  key={ct.id}
                  onPress={() => toggleContentType(ct.id)}
                  style={[styles.contentTypeCell, active && styles.contentTypeCellActive]}
                >
                  <Ionicons
                    name={ct.icon}
                    size={20}
                    color={active ? colors.primaryFg : colors.mutedFg}
                  />
                  <Text style={[styles.contentTypeCellLabel, active && styles.contentTypeCellLabelActive]}>
                    {ct.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Organizer note ────────────────────────────────────────────── */}
        <View style={styles.organizerRow}>
          <Ionicons name="person-circle-outline" size={18} color={colors.mutedFg} />
          <Text style={styles.organizerText}>
            You are the organizer of this event!
          </Text>
        </View>

        {/* ── Create button ─────────────────────────────────────────────── */}
        <Pressable
          onPress={handleCreate}
          disabled={loading}
          style={[styles.createBtn, loading && styles.createBtnDisabled]}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryFg} />
          ) : (
            <Text style={styles.createBtnText}>CREATE EVENT</Text>
          )}
        </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Date pickers ──────────────────────────────────────────────────── */}

      {renderAndroidPicker()}

      {Platform.OS === "ios" && activePicker && (
        <IOSPickerModal
          visible
          title={activePicker.title}
          value={tempPickerVal}
          mode={activePicker.mode}
          minimumDate={activePicker.minimumDate}
          onChange={(_, d) => { if (d) setTempPickerVal(d); }}
          onConfirm={confirmPicker}
          onDismiss={() => setActivePicker(null)}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (colors) => StyleSheet.create({
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
    lineHeight: 17,
    color: colors.foreground,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  content: {
    padding: 20,
    gap: 20,
    paddingBottom: 48,
  },

  // ── Banner
  bannerPicker: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerPreview: {
    width: "100%",
    height: 160,
  },
  bannerPlaceholder: {
    height: 120,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  bannerPlaceholderText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedFg,
  },

  // ── Fields
  field: { gap: 8 },
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
  subtitleInput: {
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.foreground,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  descriptionInput: {
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.foreground,
    fontSize: 14,
    lineHeight: 22,
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // ── Event type grid
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeCell: {
    width: "30%",
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeCellActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeCellLabel: {
    fontSize: 9,
    lineHeight: 13,
    color: colors.mutedFg,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    textAlign: "center",
  },
  typeCellLabelActive: { color: colors.primaryFg },

  // ── Editable type label
  typeLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: `${colors.primary}35`,
    marginTop: 2,
  },
  typeLabelIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  typeLabelPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  typeLabelText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.foreground,
  },
  typeLabelInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: colors.foreground,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
  },

  // ── Date cards
  dateCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  dateDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
  },
  selectLabel: {
    fontSize: 13,
    color: colors.mutedFg,
    width: 80,
  },
  selectValue: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
    fontWeight: "500",
    textAlign: "right",
    marginRight: 4,
  },

  // ── Time lock toggle
  toggleCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  lockModeRow: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  lockModeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.secondaryBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lockModeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  lockModeBtnText: {
    fontSize: 13,
    color: colors.mutedFg,
    fontWeight: "500",
  },
  lockModeBtnTextActive: {
    color: colors.primaryFg,
    fontWeight: "700",
  },
  lockModeHint: {
    fontSize: 12,
    color: colors.mutedFg,
    paddingHorizontal: 14,
    paddingBottom: 12,
    lineHeight: 18,
  },
  unlockDateSection: {},

  // ── Visibility toggle
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  toggleInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.foreground,
  },
  toggleSub: {
    fontSize: 12,
    color: colors.mutedFg,
    marginTop: 2,
    lineHeight: 17,
  },

  // ── Event size
  sizeRow: {
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
  sizeInput: {
    flex: 1,
    color: colors.foreground,
    fontSize: 14,
    padding: 0,
  },

  // ── Content types
  contentTypeRow: {
    flexDirection: "row",
    gap: 8,
  },
  contentTypeCell: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contentTypeCellActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  contentTypeCellLabel: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.mutedFg,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  contentTypeCellLabelActive: { color: colors.primaryFg },

  // ── Organizer
  organizerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  organizerText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedFg,
    flex: 1,
  },

  // ── Create button
  createBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    marginTop: 4,
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primaryFg,
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  // ── Modal (iOS date picker)
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
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
  iosPicker: { height: 200 },

  // ── Slug
  slugPreview: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    flexWrap: "wrap",
    gap: 8,
  },
  slugUrl: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.primary,
    fontWeight: "500",
    flex: 1,
  },
  slugBadgeAvailable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  slugBadgeTaken: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  slugBadgeText: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.success,
    fontWeight: "600",
  },
});
