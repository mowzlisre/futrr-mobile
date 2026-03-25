import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
  Linking,
  Alert,
  Dimensions,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { fonts, ROUTES } from "@/constants";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { getEvent } from "@/services/events";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BANNER_HEIGHT = 220;

const EVENT_TYPE_ICONS = {
  birthday: "balloon-outline",
  wedding: "heart-outline",
  graduation: "school-outline",
  anniversary: "ribbon-outline",
  new_year: "sparkles-outline",
  sports: "football-outline",
  travel: "airplane-outline",
  festival: "bonfire-outline",
  music: "musical-notes-outline",
  memorial: "flower-outline",
  reunion: "people-outline",
  other: "ellipsis-horizontal-circle-outline",
};

const getShareOptions = (colors) => [
  { key: "whatsapp", icon: "logo-whatsapp", label: "WhatsApp", color: "#25D366" },
  { key: "instagram", icon: "logo-instagram", label: "Instagram", color: "#E1306C" },
  { key: "snapchat", icon: "logo-snapchat", label: "Snapchat", color: "#FFFC00" },
  { key: "message", icon: "chatbubble-outline", label: "Message", color: colors.foreground },
  { key: "email", icon: "mail-outline", label: "Email", color: colors.foreground },
];

function formatDate(value) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function isEntryWindowActive(event) {
  const now = new Date();
  const start = event.entry_start ? new Date(event.entry_start) : null;
  const close = event.entry_close ? new Date(event.entry_close) : null;
  if (start && now < start) return false;
  if (close && now > close) return false;
  return true;
}

function getFillingPercent(event) {
  if (!event.max_participants || event.max_participants <= 0) return null;
  const count = event.participant_count || 0;
  return Math.min(Math.round((count / event.max_participants) * 100), 100);
}

function getContentTypesLabel(types) {
  if (!Array.isArray(types) || types.length === 0) return null;
  return types
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
    .join(", ");
}

/* ─── Avatar Stack ─── */
function AvatarStack({ participants, count }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const display = (participants || []).slice(0, 5);
  const sealed = count || 0;

  return (
    <View style={styles.avatarStackRow}>
      <View style={styles.avatarStack}>
        {display.map((p, i) => (
          <View
            key={p.id || i}
            style={[
              styles.avatarCircle,
              { marginLeft: i === 0 ? 0 : -10, zIndex: 5 - i },
            ]}
          >
            <Text style={styles.avatarInitials}>
              {getInitials(p.display_name || p.username || p.name)}
            </Text>
          </View>
        ))}
      </View>
      {sealed > 0 && (
        <Text style={styles.avatarSealedText}>
          {sealed} {sealed === 1 ? "has" : "have"} sealed
        </Text>
      )}
    </View>
  );
}

/* ─── Info Pill ─── */
function InfoPill({ icon, label }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.infoPill}>
      <Ionicons name={icon} size={13} color={colors.primary} />
      <Text style={styles.infoPillText}>{label}</Text>
    </View>
  );
}

/* ─── Share Button ─── */
function ShareButton({ icon, label, color, onPress }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable style={styles.shareBtn} onPress={onPress}>
      <View style={[styles.shareBtnCircle, { borderColor: `${color}44` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.shareBtnLabel}>{label}</Text>
    </Pressable>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */

export default function EventDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const passedEvent = route.params?.event;
  const [event, setEvent] = useState(passedEvent);

  // Fetch fresh event data on mount and when returning from CreateCapsuleScreen
  const refreshEvent = useCallback(() => {
    if (passedEvent?.id) {
      getEvent(passedEvent.id).then(setEvent).catch(() => {});
    }
  }, [passedEvent?.id]);

  useFocusEffect(refreshEvent);

  const isOrganizer =
    event.created_by && user?.id && event.created_by === user.id;
  const typeIcon =
    EVENT_TYPE_ICONS[event.event_type] || "ellipsis-horizontal-circle-outline";
  const typeLabel =
    event.event_type_label || event.event_type || "Event";
  const entryOpen = isEntryWindowActive(event);
  const fillingPercent = getFillingPercent(event);
  const contentLabel = getContentTypesLabel(event.allowed_content_types);
  const participantCount = event.participant_count || 0;
  const hasCapsule = !!event.user_has_capsule;

  const eventUrl = event.slug
    ? `https://futrr.app/events/${event.slug}`
    : `https://futrr.app/events/join/${event.invite_token}`;
  const shareText = `Join my event "${event.title}" on futrr! ${eventUrl}`;

  /* ── share handlers ── */
  const handleShare = async (key) => {
    const encoded = encodeURIComponent(shareText);
    switch (key) {
      case "whatsapp":
        Linking.openURL(`whatsapp://send?text=${encoded}`).catch(() =>
          Alert.alert("WhatsApp not installed")
        );
        break;
      case "instagram":
        await Clipboard.setStringAsync(shareText);
        Alert.alert("Link copied!", "Open Instagram to share.");
        break;
      case "snapchat":
        await Clipboard.setStringAsync(shareText);
        Alert.alert("Link copied!", "Open Snapchat to share.");
        break;
      case "message":
        Linking.openURL(`sms:&body=${encoded}`).catch(() =>
          Alert.alert("Could not open Messages")
        );
        break;
      case "email":
        Linking.openURL(
          `mailto:?subject=${encodeURIComponent(
            `Join "${event.title}" on futrr`
          )}&body=${encoded}`
        ).catch(() => Alert.alert("Could not open Mail"));
        break;
    }
  };

  /* ── render ── */
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header bar */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          EVENT DETAILS
        </Text>
        <View style={styles.headerRight}>
          {isOrganizer && (
            <Pressable
              onPress={() =>
                navigation.navigate(ROUTES.EDIT_EVENT, { event })
              }
              style={styles.iconBtn}
            >
              <Ionicons
                name="create-outline"
                size={20}
                color={colors.primary}
              />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Banner ── */}
        <View style={styles.bannerWrap}>
          {event.banner_image ? (
            <Image
              source={{ uri: event.banner_image }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={[`${colors.primary}30`, colors.card]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bannerPlaceholder}
            >
              <Ionicons name={typeIcon} size={56} color={`${colors.primary}55`} />
            </LinearGradient>
          )}

          {/* Gradient overlay at bottom of banner */}
          <LinearGradient
            colors={["transparent", colors.background]}
            style={styles.bannerFade}
          />

          {/* "OPEN FOR ENTRIES" badge */}
          {entryOpen && (
            <View style={styles.entryBadge}>
              <View style={styles.entryDot} />
              <Text style={styles.entryBadgeText}>OPEN FOR ENTRIES</Text>
            </View>
          )}

          {/* Participant count badge */}
          <View style={styles.sealedBadge}>
            <Ionicons
              name="lock-closed"
              size={11}
              color={colors.foreground}
            />
            <Text style={styles.sealedBadgeText}>
              {participantCount} sealed
            </Text>
          </View>
        </View>

        {/* ── Type label + organizer ── */}
        <View style={styles.typeLabelRow}>
          <Ionicons name={typeIcon} size={16} color={colors.primary} />
          <Text style={styles.typeLabel}>{typeLabel.toUpperCase()}</Text>
          {!!event.created_by_username && (
            <>
              <View style={styles.typeDot} />
              <Text style={styles.organizerName}>{event.created_by_username}</Text>
            </>
          )}
          {!event.created_by_username && !!event.subtitle && (
            <>
              <View style={styles.typeDot} />
              <Text style={styles.organizerName}>{event.subtitle}</Text>
            </>
          )}
        </View>

        {/* ── Title ── */}
        <Text style={styles.title}>{event.title}</Text>

        {/* ── Description ── */}
        {!!event.description && (
          <Text style={styles.description}>{event.description}</Text>
        )}

        {/* ── Info pills ── */}
        <View style={styles.infoPillsRow}>
          {event.unlock_at && (
            <InfoPill
              icon="calendar-outline"
              label={`Opens ${formatDate(event.unlock_at)}`}
            />
          )}
          {event.is_time_locked && (
            <InfoPill icon="lock-closed-outline" label="Time-locked" />
          )}
          {!event.is_time_locked && (
            <InfoPill icon="lock-open-outline" label="Open" />
          )}
          {contentLabel && (
            <InfoPill icon="images-outline" label={contentLabel} />
          )}
        </View>

        {/* ── Progress bar ── */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Capsule filling up</Text>
            <Text style={styles.progressValue}>
              {fillingPercent !== null
                ? `${fillingPercent}%`
                : `${participantCount} joined`}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width:
                    fillingPercent !== null
                      ? `${fillingPercent}%`
                      : participantCount > 0
                      ? "100%"
                      : "0%",
                },
              ]}
            />
          </View>
          {event.max_participants && (
            <Text style={styles.progressCaption}>
              {participantCount} / {event.max_participants} participants
            </Text>
          )}
        </View>

        {/* ── Avatar stack ── */}
        {Array.isArray(event.participants) && event.participants.length > 0 && (
          <AvatarStack
            participants={event.participants}
            count={participantCount}
          />
        )}

        {/* ── Participate button ── */}
        <Pressable
          style={[styles.participateBtn, hasCapsule && styles.participateBtnDisabled]}
          disabled={hasCapsule}
          onPress={() =>
            navigation.navigate(ROUTES.CREATE_CAPSULE, { event })
          }
        >
          <Ionicons
            name={hasCapsule ? "checkmark-circle" : "add-circle-outline"}
            size={20}
            color={hasCapsule ? colors.mutedFg : colors.primaryFg}
          />
          <Text
            style={[
              styles.participateBtnText,
              hasCapsule && styles.participateBtnTextDisabled,
            ]}
          >
            {hasCapsule ? "ALREADY PARTICIPATED" : "PARTICIPATE"}
          </Text>
        </Pressable>

        {/* ── Share options ── */}
        {event.invite_token && (
          <View style={styles.shareSection}>
            <Text style={styles.shareSectionLabel}>SHARE EVENT</Text>
            <View style={styles.shareRow}>
              {getShareOptions(colors).map((opt) => (
                <ShareButton
                  key={opt.key}
                  icon={opt.icon}
                  label={opt.label}
                  color={opt.color}
                  onPress={() => handleShare(opt.key)}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */

const makeStyles = (colors) => StyleSheet.create({
  /* layout */
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 60,
  },

  /* header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconBtn: {
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
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: colors.foreground,
    fontWeight: "600",
    letterSpacing: 2,
    textAlign: "center",
    marginHorizontal: 8,
  },
  headerRight: {
    width: 40,
    alignItems: "flex-end",
  },

  /* banner */
  bannerWrap: {
    width: SCREEN_WIDTH - 32,
    height: BANNER_HEIGHT,
    borderRadius: 20,
    overflow: "hidden",
    alignSelf: "center",
    marginTop: 4,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  bannerPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },

  /* banner badges */
  entryBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(10,10,15,0.75)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  entryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  entryBadgeText: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.primary,
    fontWeight: "700",
    letterSpacing: 1,
  },
  sealedBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(10,10,15,0.75)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  sealedBadgeText: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.foreground,
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  /* type label row */
  typeLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 18,
    gap: 7,
  },
  typeLabel: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.primary,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  typeDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.mutedFg,
  },
  organizerName: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedFg,
    fontWeight: "500",
  },

  /* title & description */
  title: {
    fontSize: 28,
    fontWeight: "300",
    color: colors.foreground,
    fontFamily: fonts?.serif || undefined,
    lineHeight: 36,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  description: {
    fontSize: 14,
    color: colors.mutedFg,
    lineHeight: 22,
    paddingHorizontal: 20,
    marginTop: 6,
  },

  /* info pills */
  infoPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoPillText: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.foreground,
    fontWeight: "500",
  },

  /* progress */
  progressSection: {
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 8,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 13,
    color: colors.foreground,
    fontWeight: "600",
  },
  progressValue: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "700",
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  progressCaption: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.mutedFg,
  },

  /* avatar stack */
  avatarStackRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: `${colors.primary}25`,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.primary,
    fontWeight: "700",
  },
  avatarSealedText: {
    fontSize: 13,
    color: colors.mutedFg,
    fontWeight: "500",
  },

  /* participate button */
  participateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 24,
  },
  participateBtnDisabled: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  participateBtnText: {
    color: colors.primaryFg,
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 1.5,
  },
  participateBtnTextDisabled: {
    color: colors.mutedFg,
  },

  /* share section */
  shareSection: {
    paddingHorizontal: 20,
    marginTop: 28,
    gap: 14,
  },
  shareSectionLabel: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.mutedFg,
    fontWeight: "600",
    letterSpacing: 1.5,
  },
  shareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  shareBtn: {
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  shareBtnCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  shareBtnLabel: {
    fontSize: 9,
    lineHeight: 13,
    color: colors.mutedFg,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
});
