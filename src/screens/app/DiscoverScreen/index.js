import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useState, useEffect, useCallback, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors, fonts, ROUTES } from "@/constants";
import { getDiscoverFeed, getFriendsFeed, getGlobalFeed, searchDiscover } from "@/services/discover";
import { followUser, unfollowUser } from "@/services/user";
import { normalizeCapsule } from "@/utils/normalize";
import { useAuth } from "@/hooks/useAuth";
import { getDaysUntil, formatDate } from "@/utils/date";

const FILTER_TABS = ["Trending", "Friends", "Global"];

// ─── Shared card components ───────────────────────────────────────────────────

function CapsuleRow({ capsule, onPress }) {
  const daysLeft = getDaysUntil(capsule.unlocksAt);
  const isUnlocked = capsule.status === "unlocked";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.capsuleRow, pressed && { opacity: 0.8 }]}
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
      <View style={[styles.typeBadge, capsule.isPublic && styles.publicBadge]}>
        <Text style={[styles.typeBadgeText, capsule.isPublic && styles.publicBadgeText]}>
          {capsule.isPublic ? "PUBLIC" : "PRIVATE"}
        </Text>
      </View>
    </Pressable>
  );
}

function EventRow({ event }) {
  return (
    <View style={styles.eventRow}>
      <View style={styles.eventIconWrap}>
        <Ionicons name="calendar-outline" size={16} color={colors.primary} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>{event.title}</Text>
        <Text style={styles.rowMetaText} numberOfLines={1}>{event.description || "Global event"}</Text>
      </View>
      <Pressable style={styles.joinBtn}>
        <Text style={styles.joinBtnText}>Join</Text>
      </Pressable>
    </View>
  );
}

function PersonRow({ person, onFollowToggle }) {
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

function TrendingTab({ userId }) {
  const navigation = useNavigation();
  const [capsules, setCapsules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDiscoverFeed()
      .then((d) => setCapsules(d.results.map((c) => normalizeCapsule(c, userId))))
      .catch(() => setCapsules([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />;
  if (!capsules.length)
    return <EmptyHint icon="flame-outline" text="No trending capsules yet" />;

  const featured = capsules[0];
  const rest = capsules.slice(1);
  return (
    <>
      {featured && (
        <Pressable
          onPress={() =>
            navigation.navigate(
              featured.status === "unlocked" ? ROUTES.UNLOCKED_CAPSULE : ROUTES.LOCKED_CAPSULE,
              { capsule: featured }
            )
          }
          style={styles.featuredCard}
        >
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredBadgeText}>FEATURED</Text>
          </View>
          <Text style={styles.featuredTitle}>{featured.title}</Text>
          <Text style={styles.featuredDesc} numberOfLines={2}>{featured.description}</Text>
          <View style={styles.featuredFooter}>
            <View style={styles.avatarRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{featured.fromInitial}</Text>
              </View>
              <Text style={styles.featuredFrom}> · {featured.from}</Text>
            </View>
            <View style={styles.publicBadge}>
              <Text style={styles.publicBadgeText}>PUBLIC</Text>
            </View>
          </View>
        </Pressable>
      )}
      {rest.map((c) => (
        <CapsuleRow
          key={c.id}
          capsule={c}
          onPress={() =>
            navigation.navigate(
              c.status === "unlocked" ? ROUTES.UNLOCKED_CAPSULE : ROUTES.LOCKED_CAPSULE,
              { capsule: c }
            )
          }
        />
      ))}
    </>
  );
}

function FriendsTab({ userId }) {
  const navigation = useNavigation();
  const [capsules, setCapsules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFriendsFeed()
      .then((data) => setCapsules(data.map((c) => normalizeCapsule(c, userId))))
      .catch(() => setCapsules([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />;
  if (!capsules.length)
    return <EmptyHint icon="people-outline" text="Follow people to see their public capsules here" />;

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
    />
  ));
}

function GlobalTab({ userId }) {
  const [data, setData] = useState({ events: [], capsules: [] });
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    getGlobalFeed()
      .then((d) => setData({ events: d.events ?? [], capsules: (d.capsules ?? []).map((c) => normalizeCapsule(c, userId)) }))
      .catch(() => setData({ events: [], capsules: [] }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />;
  if (!data.events.length && !data.capsules.length)
    return <EmptyHint icon="earth-outline" text="No global content yet" />;

  return (
    <>
      {data.events.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>GLOBAL EVENTS</Text>
          </View>
          {data.events.map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
        </>
      )}
      {data.capsules.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>GLOBAL CAPSULES</Text>
          </View>
          {data.capsules.map((c) => (
            <CapsuleRow
              key={c.id}
              capsule={c}
              onPress={() =>
                navigation.navigate(
                  c.status === "unlocked" ? ROUTES.UNLOCKED_CAPSULE : ROUTES.LOCKED_CAPSULE,
                  { capsule: c }
                )
              }
            />
          ))}
        </>
      )}
    </>
  );
}

function EmptyHint({ icon, text }) {
  return (
    <View style={styles.emptyBox}>
      <Ionicons name={icon} size={40} color={colors.border} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

// ─── Search results ───────────────────────────────────────────────────────────

function SearchResults({ results, userId }) {
  const navigation = useNavigation();
  const { capsules = [], people = [], events = [] } = results;
  if (!capsules.length && !people.length && !events.length) {
    return <EmptyHint icon="search-outline" text="No results found" />;
  }
  return (
    <>
      {capsules.length > 0 && (
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
              />
            );
          })}
        </>
      )}
      {people.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>PEOPLE</Text>
          </View>
          {people.map((p) => (
            <PersonRow key={p.id} person={p} />
          ))}
        </>
      )}
      {events.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>EVENTS</Text>
          </View>
          {events.map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
        </>
      )}
    </>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DiscoverScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("Trending");
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef(null);

  const handleSearchChange = (text) => {
    setSearchText(text);
    clearTimeout(searchTimer.current);
    if (!text.trim()) {
      setSearchResults(null);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchDiscover(text.trim());
        setSearchResults(res);
      } catch (_) {
        setSearchResults({ capsules: [], people: [], events: [] });
      } finally {
        setSearching(false);
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
        />
        {searchText.length > 0 && (
          <Pressable onPress={() => { setSearchText(""); setSearchResults(null); }}>
            <Ionicons name="close-circle" size={18} color={colors.mutedFg} />
          </Pressable>
        )}
      </View>

      {/* Tabs — hidden while searching */}
      {!isSearching && (
        <View style={styles.filterRow}>
          {FILTER_TABS.map((tab) => (
            <Pressable
              key={tab}
              style={[styles.filterTab, activeTab === tab && styles.filterTabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.filterTabText, activeTab === tab && styles.filterTabTextActive]}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Content */}
      {isSearching ? (
        searching ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : searchResults ? (
          <SearchResults results={searchResults} userId={user?.id} />
        ) : null
      ) : (
        <>
          {activeTab === "Trending" && <TrendingTab userId={user?.id} />}
          {activeTab === "Friends" && <FriendsTab userId={user?.id} />}
          {activeTab === "Global" && <GlobalTab userId={user?.id} />}
        </>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 },

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

  featuredCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  featuredBadge: {
    alignSelf: "flex-start",
    backgroundColor: `${colors.primary}25`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  featuredBadgeText: { fontSize: 9, color: colors.primary, fontWeight: "700", letterSpacing: 1.5 },
  featuredTitle: { fontSize: 20, fontWeight: "300", color: colors.foreground, marginBottom: 8, fontFamily: fonts.serif },
  featuredDesc: { fontSize: 13, color: colors.mutedFg, lineHeight: 20, marginBottom: 16 },
  featuredFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  avatarRow: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.secondaryBackground,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 10, fontWeight: "700", color: colors.foreground },
  featuredFrom: { fontSize: 12, color: colors.mutedFg },

  capsuleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
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
  typeBadge: {
    backgroundColor: colors.secondaryBackground,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 8,
  },
  typeBadgeText: { fontSize: 9, fontWeight: "700", color: colors.mutedFg },
  publicBadge: { backgroundColor: `${colors.primary}20`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  publicBadgeText: { fontSize: 9, fontWeight: "700", color: colors.primary, letterSpacing: 0.5 },

  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
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
  joinBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14,
  },
  joinBtnText: { fontSize: 12, fontWeight: "700", color: colors.primaryFg },

  personRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
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
});
