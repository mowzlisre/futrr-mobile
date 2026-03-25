import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useState, useRef, useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/constants";
import { useTheme } from "@/hooks/useTheme";
import { addRecipient, removeRecipient } from "@/services/capsules";
import { searchUsers } from "@/services/user";

// ─── Avatar chip (shared) ─────────────────────────────────────────────────────

function AvatarChip({ recipient, onRemove, colors, styles }) {
  return (
    <View style={styles.chip}>
      <View style={styles.chipAvatar}>
        {recipient.avatar ? (
          <Image source={{ uri: recipient.avatar }} style={styles.chipAvatarImg} />
        ) : (
          <Text style={styles.chipInitial}>{recipient.initial}</Text>
        )}
      </View>
      <Text style={styles.chipName} numberOfLines={1}>{recipient.username}</Text>
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={6} style={styles.chipRemove}>
          <Ionicons name="close-circle" size={16} color={colors.mutedFg} />
        </Pressable>
      )}
    </View>
  );
}

// ─── Management modal ─────────────────────────────────────────────────────────

export function RecipientsModal({ visible, capsuleId, recipients, onClose, onChanged }) {
  const [list, setList] = useState(recipients);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(null); // userId being mutated
  const debounceRef = useRef(null);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // keep local list in sync when prop changes (e.g. initial open)
  const handleOpen = () => setList(recipients);

  const handleSearch = useCallback((text) => {
    setQuery(text);
    clearTimeout(debounceRef.current);
    if (!text.trim()) { setResults([]); return; }
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

  const handleAdd = async (user) => {
    const userId = user.id;
    if (list.some((r) => r.userId === userId)) return;
    try {
      setBusy(userId);
      await addRecipient(capsuleId, { user_id: userId });
      const newR = {
        id: userId,
        userId,
        username: user.username,
        avatar: user.avatar ?? null,
        initial: (user.username ?? "?")[0].toUpperCase(),
      };
      const next = [...list, newR];
      setList(next);
      onChanged?.(next);
      setQuery("");
      setResults([]);
    } catch {
      Alert.alert("Error", "Could not add recipient.");
    } finally {
      setBusy(null);
    }
  };

  const handleRemove = async (recipient) => {
    try {
      setBusy(recipient.userId);
      await removeRecipient(capsuleId, recipient.id);
      const next = list.filter((r) => r.id !== recipient.id);
      setList(next);
      onChanged?.(next);
    } catch {
      Alert.alert("Error", "Could not remove recipient.");
    } finally {
      setBusy(null);
    }
  };

  const alreadyAdded = (userId) => list.some((r) => r.userId === userId);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onShow={handleOpen}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Recipients</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.mutedFg} />
            </Pressable>
          </View>

          {/* Current recipients */}
          {list.length > 0 && (
            <View style={styles.currentList}>
              {list.map((r) => (
                <View key={r.id} style={styles.recipientRow}>
                  <View style={styles.recipientAvatar}>
                    {r.avatar ? (
                      <Image source={{ uri: r.avatar }} style={styles.recipientAvatarImg} />
                    ) : (
                      <Text style={styles.recipientInitial}>{r.initial}</Text>
                    )}
                  </View>
                  <Text style={styles.recipientName}>{r.username}</Text>
                  <Pressable
                    onPress={() => handleRemove(r)}
                    disabled={busy === r.userId}
                    style={styles.removeBtn}
                    hitSlop={6}
                  >
                    {busy === r.userId ? (
                      <ActivityIndicator size="small" color={colors.mutedFg} />
                    ) : (
                      <Ionicons name="remove-circle-outline" size={18} color={colors.mutedFg} />
                    )}
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {list.length === 0 && (
            <Text style={styles.emptyNote}>No recipients yet.</Text>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Search to add */}
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={16} color={colors.mutedFg} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users to add…"
              placeholderTextColor={colors.mutedFg}
              value={query}
              onChangeText={handleSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searching && <ActivityIndicator size="small" color={colors.primary} />}
          </View>

          {results.length > 0 && (
            <FlatList
              data={results}
              keyExtractor={(u) => String(u.id)}
              style={styles.resultList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const added = alreadyAdded(item.id);
                return (
                  <Pressable
                    onPress={() => !added && handleAdd(item)}
                    style={styles.resultRow}
                    disabled={added || busy === item.id}
                  >
                    <View style={styles.recipientAvatar}>
                      {item.avatar ? (
                        <Image source={{ uri: item.avatar }} style={styles.recipientAvatarImg} />
                      ) : (
                        <Text style={styles.recipientInitial}>
                          {(item.username ?? "?")[0].toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.recipientName, added && { color: colors.mutedFg }]}>
                      {item.username}
                    </Text>
                    {busy === item.id ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons
                        name={added ? "checkmark-circle" : "add-circle-outline"}
                        size={18}
                        color={added ? colors.primary : colors.mutedFg}
                      />
                    )}
                  </Pressable>
                );
              }}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Inline display row ───────────────────────────────────────────────────────

export function RecipientsSection({ capsuleId, recipients: initial, style }) {
  const [recipients, setRecipients] = useState(initial ?? []);
  const [modalOpen, setModalOpen] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={[styles.section, style]}>
      <Pressable style={styles.sectionRow} onPress={() => setModalOpen(true)}>
        <Ionicons name="people-outline" size={15} color={colors.mutedFg} />
        <Text style={styles.sectionLabel}>
          {recipients.length === 0 ? "Add recipients" : "Recipients"}
        </Text>

        {/* Avatar stack */}
        <View style={styles.avatarStack}>
          {recipients.slice(0, 4).map((r, i) => (
            <View
              key={r.id}
              style={[styles.stackAvatar, { marginLeft: i === 0 ? 0 : -10, zIndex: 10 - i }]}
            >
              {r.avatar ? (
                <Image source={{ uri: r.avatar }} style={styles.stackAvatarImg} />
              ) : (
                <Text style={styles.stackInitial}>{r.initial}</Text>
              )}
            </View>
          ))}
          {recipients.length > 4 && (
            <View style={[styles.stackAvatar, styles.stackMore, { marginLeft: -10 }]}>
              <Text style={styles.stackMoreText}>+{recipients.length - 4}</Text>
            </View>
          )}
          {recipients.length === 0 && (
            <Ionicons name="add-circle-outline" size={18} color={colors.mutedFg} />
          )}
        </View>

        <Ionicons name="chevron-forward" size={14} color={colors.mutedFg} style={{ marginLeft: "auto" }} />
      </Pressable>

      <RecipientsModal
        visible={modalOpen}
        capsuleId={capsuleId}
        recipients={recipients}
        onClose={() => setModalOpen(false)}
        onChanged={setRecipients}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (colors) => StyleSheet.create({
  // inline section
  section: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
  },
  sectionLabel: {
    fontSize: 13,
    color: colors.mutedFg,
    fontWeight: "500",
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 4,
  },
  stackAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.secondaryBackground,
    borderWidth: 1.5,
    borderColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  stackAvatarImg: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  stackInitial: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "700",
    color: colors.foreground,
  },
  stackMore: {
    backgroundColor: colors.secondaryBackground,
  },
  stackMoreText: {
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "700",
    color: colors.mutedFg,
  },

  // chip (not used in section, kept for reference)
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  chipAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  chipAvatarImg: { width: 22, height: 22, borderRadius: 11 },
  chipInitial: { fontSize: 9, fontWeight: "700", color: colors.foreground },
  chipName: { fontSize: 12, color: colors.foreground, maxWidth: 80 },
  chipRemove: { marginLeft: 2 },

  // modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: "80%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.foreground,
    fontFamily: fonts.serif,
  },
  currentList: {
    paddingHorizontal: 20,
    gap: 4,
  },
  recipientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  recipientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondaryBackground,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  recipientAvatarImg: { width: 36, height: 36, borderRadius: 18 },
  recipientInitial: { fontSize: 13, fontWeight: "700", color: colors.foreground },
  recipientName: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
    fontWeight: "500",
  },
  removeBtn: { padding: 4 },
  emptyNote: {
    fontSize: 13,
    color: colors.mutedFg,
    textAlign: "center",
    paddingVertical: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
    marginVertical: 12,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    backgroundColor: colors.secondaryBackground,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
  },
  resultList: {
    maxHeight: 220,
    paddingHorizontal: 20,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
});
