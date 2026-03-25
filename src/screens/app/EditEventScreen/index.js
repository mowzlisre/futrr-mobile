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
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { updateEvent, deleteEvent, checkEventSlug } from "@/services/events";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d) {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// ─── iOS date picker modal ─────────────────────────────────────────────────────

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

// ─── DateRow ──────────────────────────────────────────────────────────────────

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

export default function EditEventScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation();
  const route = useRoute();
  const { event } = route.params;

  // ── Core fields (initialised from existing event) ─────────────────────────
  const [title, setTitle] = useState(event.title || "");
  const [subtitle, setSubtitle] = useState(event.subtitle || "");
  const [description, setDescription] = useState(event.description || "");

  // ── Event type ────────────────────────────────────────────────────────────
  const [eventType, setEventType] = useState(event.event_type || "other");
  const [typeLabel, setTypeLabel] = useState(
    event.event_type_label ||
    EVENT_TYPES.find((t) => t.id === (event.event_type || "other"))?.label ||
    "Other"
  );
  const [editingLabel, setEditingLabel] = useState(false);

  // ── Entry window ──────────────────────────────────────────────────────────
  const [entryStart, setEntryStart] = useState(
    event.entry_start ? new Date(event.entry_start) : new Date()
  );
  const [entryClose, setEntryClose] = useState(
    event.entry_close ? new Date(event.entry_close) : new Date()
  );

  // ── Time-lock ─────────────────────────────────────────────────────────────
  const [isTimeLocked, setIsTimeLocked] = useState(
    event.is_time_locked !== undefined ? event.is_time_locked : true
  );
  const [unlockDate, setUnlockDate] = useState(
    event.unlock_at ? new Date(event.unlock_at) : new Date("2026-12-25")
  );

  // ── Visibility & participants ─────────────────────────────────────────────
  const [isPublic, setIsPublic] = useState(event.is_public || false);
  const [maxParticipants, setMaxParticipants] = useState(
    event.max_participants ? String(event.max_participants) : ""
  );

  // ── Allowed content types ─────────────────────────────────────────────────
  const [allowedTypes, setAllowedTypes] = useState(
    Array.isArray(event.allowed_content_types) && event.allowed_content_types.length > 0
      ? event.allowed_content_types
      : ["text", "photo", "video", "voice"]
  );

  // ── Banner image ─────────────────────────────────────────────────────────
  const [bannerUri, setBannerUri] = useState(event.banner_image || null);
  const [bannerChanged, setBannerChanged] = useState(false);

  // ── Custom URL slug ─────────────────────────────────────────────────────
  const [slugInput, setSlugInput] = useState(event.slug || "");
  const [slugStatus, setSlugStatus] = useState(event.slug ? "available" : null);
  const slugTimer = useRef(null);

  const handleSlugChange = useCallback((text) => {
    const cleaned = text.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    setSlugInput(cleaned);
    clearTimeout(slugTimer.current);
    if (!cleaned || cleaned === "-") {
      setSlugStatus(null);
      return;
    }
    if (cleaned === event.slug) {
      setSlugStatus("available");
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
  }, [event.slug]);

  // ── Submit / delete state ─────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Date picker state ─────────────────────────────────────────────────────
  const [activePicker, setActivePicker] = useState(null);
  const [tempPickerVal, setTempPickerVal] = useState(new Date());

  // ── Picker helpers ────────────────────────────────────────────────────────

  const openPicker = (field, mode, title, currentVal, minimumDate) => {
    setTempPickerVal(new Date(currentVal));
    setActivePicker({ field, mode, title, minimumDate: minimumDate || new Date() });
  };

  const applyPickerValue = (field, val) => {
    if (field === "entryStart") {
      setEntryStart(val);
    } else if (field === "entryCloseDate") {
      const updated = new Date(entryClose);
      updated.setFullYear(val.getFullYear(), val.getMonth(), val.getDate());
      setEntryClose(updated);
    } else if (field === "entryCloseTime") {
      const updated = new Date(entryClose);
      updated.setHours(val.getHours(), val.getMinutes(), 0, 0);
      setEntryClose(updated);
    } else if (field === "unlockDate") {
      const updated = new Date(unlockDate);
      updated.setFullYear(val.getFullYear(), val.getMonth(), val.getDate());
      setUnlockDate(updated);
    } else if (field === "unlockTime") {
      const updated = new Date(unlockDate);
      updated.setHours(val.getHours(), val.getMinutes(), 0, 0);
      setUnlockDate(updated);
    }
  };

  const confirmPicker = () => {
    if (!activePicker) return;
    applyPickerValue(activePicker.field, tempPickerVal);
    setActivePicker(null);
  };

  const handleAndroidChange = (field, e, selectedDate) => {
    if (e.type === "dismissed" || !selectedDate) return;
    applyPickerValue(field, selectedDate);
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
      setBannerChanged(true);
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

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
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
      const cleanSlug = slugInput.replace(/^-+|-+$/g, "");
      await updateEvent(event.id, {
        title: title.trim(),
        subtitle: subtitle.trim(),
        description: description.trim(),
        slug: cleanSlug || "",
        event_type: eventType,
        event_type_label: typeLabel.trim(),
        is_time_locked: isTimeLocked,
        unlock_at: isTimeLocked ? unlockDate.toISOString() : null,
        entry_start: entryStart.toISOString(),
        entry_close: entryClose.toISOString(),
        is_public: isPublic,
        max_participants: maxParticipants ? parseInt(maxParticipants, 10) : null,
        allowed_content_types: allowedTypes,
      }, bannerChanged ? bannerUri : null);
      Alert.alert("Saved!", "Your event has been updated.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Failed to save event";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = () => {
    Alert.alert(
      "Delete event",
      "This will permanently delete the event. All capsules created by participants will be preserved — they'll just no longer be linked to this event.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteEvent(event.id);
              navigation.popToTop();
            } catch (err) {
              const msg = err?.response?.data?.error || err?.message || "Failed to delete event";
              Alert.alert("Error", msg);
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  // ── Android pickers ───────────────────────────────────────────────────────

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
        <Text style={styles.headerTitle}>EDIT EVENT</Text>
        <Pressable onPress={handleDelete} disabled={deleting} style={styles.deleteBtn}>
          {deleting ? (
            <ActivityIndicator size="small" color={colors.error || "#e05c5c"} />
          ) : (
            <Ionicons name="trash-outline" size={20} color={colors.error || "#e05c5c"} />
          )}
        </Pressable>
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
                <View style={styles.slugBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={[styles.slugBadgeText, { color: colors.success }]}>Available</Text>
                </View>
              )}
              {slugStatus === "taken" && (
                <View style={styles.slugBadge}>
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

        {/* ── Save button ───────────────────────────────────────────────── */}
        <Pressable
          onPress={handleSave}
          disabled={loading}
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryFg} />
          ) : (
            <Text style={styles.saveBtnText}>SAVE CHANGES</Text>
          )}
        </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>

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
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.secondaryBackground || colors.background,
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
  lockModeBtnTextActive: { color: colors.primaryFg },
  lockModeHint: {
    fontSize: 12,
    color: colors.mutedFg,
    paddingHorizontal: 16,
    paddingBottom: 12,
    lineHeight: 18,
  },
  unlockDateSection: { gap: 0 },

  // ── Visibility toggle
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
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
    color: colors.foreground,
    fontWeight: "500",
  },
  toggleSub: {
    fontSize: 11,
    color: colors.mutedFg,
    marginTop: 2,
    lineHeight: 16,
  },

  // ── Event size
  sizeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sizeInput: {
    flex: 1,
    color: colors.foreground,
    fontSize: 14,
  },

  // ── Content type selector
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
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contentTypeCellActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  contentTypeCellLabel: {
    fontSize: 9,
    lineHeight: 13,
    color: colors.mutedFg,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  contentTypeCellLabelActive: { color: colors.primaryFg },

  // ── Save button
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: colors.primaryFg,
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // ── iOS picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  iosPickerCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  iosPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iosPickerTitle: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.mutedFg,
    letterSpacing: 1.5,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  iosDoneBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: `${colors.primary}20`,
    borderRadius: 20,
  },
  iosDoneBtnText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 13,
  },
  iosPicker: {
    height: 200,
  },

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
  slugBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  slugBadgeText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
  },
});
