import {
  View,
  Text,
  Image,
  ScrollView,
  RefreshControl,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useState, useEffect, useCallback, useRef, memo, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { fonts, ROUTES } from "@/constants";
import { useTheme } from "@/hooks/useTheme";
import { getFriendsFeed, getGlobalFeed, searchDiscover } from "@/services/discover";
import { getEvents } from "@/services/events";
import { followUser, unfollowUser } from "@/services/user";
import { normalizeCapsule } from "@/utils/normalize";
import { useAuth } from "@/hooks/useAuth";
import { getDaysUntil, formatDate } from "@/utils/date";
import { eventBus } from "@/utils/eventBus";

const FILTER_TABS = ["Friends", "Events", "Global"];

// ─── Shared card components ───────────────────────────────────────────────────

function CapsuleRow({ capsule, onPress, styles }) {
  const { colors } = useTheme();
  const daysLeft = getDaysUntil(capsule.unlocksAt);
  const isUnlocked = capsule.status === "unlocked";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.capsuleRow,
        isUnlocked && styles.capsuleRowUnlocked,
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={[styles.rowLock, isUnlocked && styles.rowLockUnlocked]}>
        <Ionicons
          name={isUnlocked ? "lock-open-outline" : "lock-closed-outline"}
          size={15}
          color={isUnlocked ? colors.primary : colors.mutedFg}
        />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>{capsule.title}</Text>
        <View style={styles.rowMeta}>
          <Ionicons name="person-outline" size={11} color={colors.mutedFg} />
          <Text style={styles.rowMetaText}>{capsule.from}</Text>
          <Text style={styles.rowDot}>·</Text>
          <Text style={styles.rowMetaText}>
            {isUnlocked ? `Unlocked ${formatDate(capsule.unlocksAt)}` : `${daysLeft}d left`}
          </Text>
        </View>
      </View>
      <View style={[styles.statusPill, isUnlocked && styles.statusPillUnlocked]}>
        <Ionicons
          name={isUnlocked ? "lock-open-outline" : "lock-closed-outline"}
          size={10}
          color={isUnlocked ? colors.primary : colors.mutedFg}
        />
        <Text style={[styles.statusPillText, isUnlocked && styles.statusPillTextUnlocked]}>
          {isUnlocked ? "Unlocked" : "Sealed"}
        </Text>
      </View>
    </Pressable>
  );
}

function DiscoverCapsuleCard({ capsule, onPress, styles }) {
  const { colors } = useTheme();
  const isUnlocked = capsule.status === "unlocked";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.discoverCard, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardAvatar}>
          {capsule.fromAvatar ? (
            <Image source={{ uri: capsule.fromAvatar }} style={styles.cardAvatarImg} />
          ) : (
            <Text style={styles.cardAvatarText}>{capsule.fromInitial}</Text>
          )}
        </View>
        <View style={styles.cardSenderInfo}>
          <Text style={styles.cardSenderName}>{capsule.from}</Text>
          {capsule.sealedAt ? (
            <Text style={styles.cardSealedDate}>Sealed {formatDate(capsule.sealedAt)}</Text>
          ) : null}
        </View>
        <View style={[styles.statusPill, isUnlocked && styles.statusPillUnlocked]}>
          <Ionicons
            name={isUnlocked ? "lock-open-outline" : "lock-closed-outline"}
            size={10}
            color={isUnlocked ? colors.primary : colors.mutedFg}
          />
          <Text style={[styles.statusPillText, isUnlocked && styles.statusPillTextUnlocked]}>
            {isUnlocked ? "Unlocked" : "Sealed"}
          </Text>
        </View>
      </View>
      <Text style={styles.discoverCardTitle} numberOfLines={2}>{capsule.title}</Text>
      {!!capsule.description && (
        <Text style={styles.discoverCardDesc} numberOfLines={2}>{capsule.description}</Text>
      )}
      <View style={styles.cardFooter}>
        <View style={styles.datePill}>
          <Text style={styles.datePillText}>
            {isUnlocked ? "Unlocked " : "Unlocks "}{formatDate(capsule.unlocksAt)}
          </Text>
        </View>
        <Text style={styles.typeLabel}>{capsule.type}</Text>
      </View>
    </Pressable>
  );
}

function EventRow({ event, styles }) {
  const { colors } = useTheme();
  const navigation = useNavigation();
  return (
    <Pressable
      onPress={() => navigation.navigate(ROUTES.EVENT_DETAIL, { event })}
      style={({ pressed }) => [styles.eventRow, pressed && { opacity: 0.8 }]}
    >
      <View style={styles.eventIconWrap}>
        <Ionicons name="calendar-outline" size={16} color={colors.primary} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>{event.title} / {event.subtitle}</Text>
        <Text style={styles.rowMetaText} numberOfLines={1}>{event.description || "Global event"}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={colors.mutedFg} />
    </Pressable>
  );
}

function PersonRow({ person, onFollowToggle, styles }) {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [following, setFollowing] = useState(person.is_following);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (following) {
        await unfollowUser(person.id);
        setFollowing(false);
      } else {
        await followUser(person.id);
        setFollowing(true);
      }
      onFollowToggle?.(person.id, !following);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const goToProfile = () => {
    navigation.navigate(ROUTES.USER_PROFILE, { userId: person.id, username: person.username });
  };

  return (
    <View style={styles.personRow}>
      <Pressable onPress={goToProfile} style={styles.personAvatar}>
        <Text style={styles.personAvatarText}>
          {(person.username || "?")[0].toUpperCase()}
        </Text>
      </Pressable>
      <Pressable onPress={goToProfile} style={styles.rowInfo}>
        <Text style={styles.rowTitle}>@{person.username}</Text>
        <Text style={styles.rowMetaText}>
          {person.followers_count ?? 0} followers · {person.capsules_sealed ?? 0} capsules
        </Text>
      </Pressable>
      <Pressable
        onPress={toggle}
        disabled={loading}
        style={[styles.followBtn, following && styles.followingBtn]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={following ? colors.mutedFg : colors.primaryFg} />
        ) : (
          <Text style={[styles.followBtnText, following && styles.followingBtnText]}>
            {following ? "Following" : "Follow"}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

// ─── Tab content ──────────────────────────────────────────────────────────────

const FriendsTab = memo(function FriendsTab({ userId, refreshKey, styles }) {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [capsules, setCapsules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    getFriendsFeed()
      .then((data) => {
        const list = data.results ?? data;
        setCapsules(list.map((c) => normalizeCapsule(c, userId)));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [refreshKey]);

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />;
  if (error) return <ErrorHint onRetry={load} styles={styles} />;
  if (!capsules.length)
    return <EmptyHint icon="people-outline" text="Follow people to see their public capsules here" styles={styles} />;

  return capsules.map((c) => (
    <CapsuleRow
      key={c.id}
      capsule={c}
      onPress={() =>
        navigation.navigate(
          c.status === "unlocked" ? ROUTES.UNLOCKED_CAPSULE : ROUTES.LOCKED_CAPSULE,
          { capsule: c }
        )
      }
      styles={styles}
    />
  ));
});

const EventsTab = memo(function EventsTab({ refreshKey, styles }) {
  const { colors } = useTheme();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    getEvents()
      .then((d) => setEvents(d.results ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [refreshKey]);

  // Listen for new events from CreateEventScreen
  useEffect(() => {
    return eventBus.on((newEvent) => {
      setEvents((prev) => [newEvent, ...prev.filter((e) => e.id !== newEvent.id)]);
    });
  }, []);

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />;
  if (error) return <ErrorHint onRetry={load} styles={styles} />;
  if (!events.length)
    return <EmptyHint icon="calendar-outline" text="No events yet" styles={styles} />;

  return events.map((e) => <EventRow key={e.id} event={e} styles={styles} />);
});

const GlobalTab = memo(function GlobalTab({ userId, refreshKey, styles }) {
  const { colors } = useTheme();
  const [capsules, setCapsules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const navigation = useNavigation();

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    getGlobalFeed()
      .then((d) => setCapsules((d.capsules ?? []).map((c) => normalizeCapsule(c, userId))))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [refreshKey]);

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />;
  if (error) return <ErrorHint onRetry={load} styles={styles} />;
  if (!capsules.length)
    return <EmptyHint icon="earth-outline" text="No global capsules yet" styles={styles} />;

  return capsules.map((c) => (
    <DiscoverCapsuleCard
      key={c.id}
      capsule={c}
      onPress={() =>
        navigation.navigate(
          c.status === "unlocked" ? ROUTES.UNLOCKED_CAPSULE : ROUTES.LOCKED_CAPSULE,
          { capsule: c }
        )
      }
      styles={styles}
    />
  ));
});

function EmptyHint({ icon, text, styles }) {
  const { colors } = useTheme();
  return (
    <View style={styles.emptyBox}>
      <Ionicons name={icon} size={40} color={colors.border} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function ErrorHint({ onRetry, styles }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onRetry} style={styles.errorBox}>
      <Ionicons name="cloud-offline-outline" size={40} color={colors.border} />
      <Text style={styles.errorText}>Could not load content</Text>
      <Text style={styles.retryText}>Tap to retry</Text>
    </Pressable>
  );
}

// ─── Search results ───────────────────────────────────────────────────────────

const SearchResults = memo(function SearchResults({ results, userId, activeTab, styles }) {
  const navigation = useNavigation();
  const { capsules = [], people = [], events = [] } = results;

  // Filter results based on active tab
  const showCapsules = activeTab === "Friends" || activeTab === "Global";
  const showEvents = activeTab === "Events";
  const showPeople = activeTab === "Friends";

  const hasCapsules = showCapsules && capsules.length > 0;
  const hasEvents = showEvents && events.length > 0;
  const hasPeople = showPeople && people.length > 0;

  if (!hasCapsules && !hasEvents && !hasPeople) {
    return <EmptyHint icon="search-outline" text="No results found" styles={styles} />;
  }
  return (
    <>
      {hasCapsules && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>CAPSULES</Text>
          </View>
          {capsules.map((c) => {
            const cap = normalizeCapsule(c, userId);
            return (
              <CapsuleRow
                key={cap.id}
                capsule={cap}
                onPress={() =>
                  navigation.navigate(
                    cap.status === "unlocked" ? ROUTES.UNLOCKED_CAPSULE : ROUTES.LOCKED_CAPSULE,
                    { capsule: cap }
                  )
                }
                styles={styles}
              />
            );
          })}
        </>
      )}
      {hasPeople && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>PEOPLE</Text>
          </View>
          {people.map((p) => (
            <PersonRow key={p.id} person={p} styles={styles} />
          ))}
        </>
      )}
      {hasEvents && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>EVENTS</Text>
          </View>
          {events.map((e) => (
            <EventRow key={e.id} event={e} styles={styles} />
          ))}
        </>
      )}
    </>
  );
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DiscoverScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [activeTab, setActiveTab] = useState("Friends");
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const searchTimer = useRef(null);
  const searchVersionRef = useRef(0);

  // Clean up search timer on unmount
  useEffect(() => {
    return () => clearTimeout(searchTimer.current);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    // Small delay to let tabs re-fetch
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleSearchChange = (text) => {
    setSearchText(text);
    clearTimeout(searchTimer.current);
    if (!text.trim()) {
      setSearchResults(null);
      return;
    }
    const version = ++searchVersionRef.current;
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchDiscover(text.trim());
        if (searchVersionRef.current === version) {
          setSearchResults(res);
        }
      } catch (_) {
        if (searchVersionRef.current === version) {
          setSearchResults({ capsules: [], people: [], events: [] });
        }
      } finally {
        if (searchVersionRef.current === version) {
          setSearching(false);
        }
      }
    }, 400);
  };

  const isSearching = searchText.trim().length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
      }
    >
      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.mutedFg} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search capsules, people, events..."
          placeholderTextColor={colors.mutedFg}
          value={searchText}
          onChangeText={handleSearchChange}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search"
        />
        {searchText.length > 0 && (
          <Pressable onPress={() => { setSearchText(""); setSearchResults(null); }}>
            <Ionicons name="close-circle" size={18} color={colors.mutedFg} />
          </Pressable>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.filterRow}>
        {FILTER_TABS.map((tab) => (
          <Pressable
            key={tab}
            style={[styles.filterTab, activeTab === tab && styles.filterTabActive]}
            onPress={() => setActiveTab(tab)}
            accessibilityRole="tab"
            accessibilityLabel={tab}
            accessibilityState={{ selected: activeTab === tab }}
          >
            <Text style={[styles.filterTabText, activeTab === tab && styles.filterTabTextActive]}>
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {isSearching ? (
        searching ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : searchResults ? (
          <SearchResults results={searchResults} userId={user?.id} activeTab={activeTab} styles={styles} />
        ) : null
      ) : (
        <>
          {activeTab === "Friends" && <FriendsTab userId={user?.id} refreshKey={refreshKey} styles={styles} />}
          {activeTab === "Events" && <EventsTab refreshKey={refreshKey} styles={styles} />}
          {activeTab === "Global" && <GlobalTab userId={user?.id} refreshKey={refreshKey} styles={styles} />}
        </>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 120 },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    marginBottom: 16,
  },
  searchInput: { flex: 1, color: colors.foreground, fontSize: 14, padding: 0 },

  filterRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  filterTab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterTabText: { fontSize: 13, color: colors.mutedFg, fontWeight: "500" },
  filterTabTextActive: { color: colors.primaryFg, fontWeight: "700" },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, marginTop: 8 },
  sectionTitle: { fontSize: 10, color: colors.mutedFg, letterSpacing: 2, textTransform: "uppercase", fontWeight: "500" },

  datePill: {
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
    borderColor: `${colors.primary}35`,
  },
  datePillText: { fontSize: 11, color: colors.primary, fontWeight: "500" },

  capsuleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  capsuleRowUnlocked: {
    borderColor: `${colors.primary}35`,
    backgroundColor: `${colors.primary}06`,
  },
  rowLock: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.secondaryBackground,
    alignItems: "center", justifyContent: "center",
    marginRight: 12,
  },
  rowLockUnlocked: { backgroundColor: `${colors.primary}18` },
  rowInfo: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 14, fontWeight: "300", color: colors.foreground, fontFamily: fonts.serif },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  rowMetaText: { fontSize: 11, color: colors.mutedFg },
  rowDot: { fontSize: 11, color: colors.mutedFg },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.secondaryBackground,
    paddingHorizontal: 9, paddingVertical: 5,
    borderRadius: 20, marginLeft: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  statusPillUnlocked: {
    backgroundColor: `${colors.primary}15`,
    borderColor: `${colors.primary}50`,
  },
  statusPillText: { fontSize: 10, fontWeight: "600", color: colors.mutedFg },
  statusPillTextUnlocked: { color: colors.primary },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  eventIconWrap: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: `${colors.primary}18`,
    alignItems: "center", justifyContent: "center",
    marginRight: 12,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  personAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.secondaryBackground,
    borderWidth: 1.5, borderColor: `${colors.primary}30`,
    alignItems: "center", justifyContent: "center",
    marginRight: 12,
  },
  personAvatarText: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  followBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14, minWidth: 80, alignItems: "center",
  },
  followingBtn: { backgroundColor: colors.secondaryBackground, borderWidth: 1, borderColor: colors.border },
  followBtnText: { fontSize: 12, fontWeight: "700", color: colors.primaryFg },
  followingBtnText: { color: colors.mutedFg },

  emptyBox: { alignItems: "center", gap: 12, marginTop: 48 },
  emptyText: { fontSize: 14, color: colors.mutedFg, textAlign: "center" },
  errorBox: { alignItems: "center", gap: 8, marginTop: 48 },
  errorText: { fontSize: 14, color: colors.mutedFg },
  retryText: { fontSize: 12, color: colors.primary },

  discoverCard: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.secondaryBackground,
    borderWidth: 1.5, borderColor: `${colors.primary}40`,
    alignItems: "center", justifyContent: "center",
  },
  cardAvatarImg: { width: 36, height: 36, borderRadius: 18 },
  cardAvatarText: { fontSize: 13, fontWeight: "700", color: colors.foreground },
  cardSenderInfo: { flex: 1, gap: 2 },
  cardSenderName: { fontSize: 14, fontWeight: "500", color: colors.foreground },
  cardSealedDate: { fontSize: 11, color: colors.mutedFg },
  discoverCardTitle: {
    fontSize: 16, fontWeight: "300", color: colors.foreground,
    fontFamily: fonts.serif, lineHeight: 23,
  },
  discoverCardDesc: {
    fontSize: 12, color: colors.mutedFg, lineHeight: 18, marginTop: -4,
  },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  typeLabel: { fontSize: 10, color: colors.mutedFg, letterSpacing: 1, textTransform: "uppercase", fontWeight: "500" },
});
