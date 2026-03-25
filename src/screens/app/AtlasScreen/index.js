import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { useTheme } from "@/hooks/useTheme";
import { ROUTES } from "@/constants/routes";
import { getMapCapsules } from "@/services/capsules";
import { normalizeCapsule } from "@/utils/normalize";

// Zoom thresholds (latitudeDelta)
const ZOOM_CITY   = 15;   // > 15 → city-level clusters
const ZOOM_AREA   = 3;    // 3-15 → neighbourhood clusters
const ZOOM_STREET = 0.5;  // < 0.5 → individual pins

function getClusterPrecision(latitudeDelta) {
  if (latitudeDelta > ZOOM_CITY) return 4;   // ~4° grid (city-level)
  if (latitudeDelta > ZOOM_AREA) return 1;   // ~1° grid (neighbourhood)
  if (latitudeDelta > ZOOM_STREET) return 0.2; // ~0.2° grid (block)
  return null; // individual pins
}

function clusterCapsules(capsules, latitudeDelta) {
  const precision = getClusterPrecision(latitudeDelta);

  if (precision === null) {
    // Individual pins — no clustering
    return capsules
      .filter((c) => c.latitude != null && c.longitude != null)
      .map((c) => ({
        id: c.id,
        coordinate: { latitude: c.latitude, longitude: c.longitude },
        count: 1,
        label: c.location_name || c.title || "Capsule",
        locationName: c.location_name || null,
        isCluster: false,
        capsules: [c],
      }));
  }

  const buckets = {};
  capsules.forEach((c) => {
    if (c.latitude == null || c.longitude == null) return;
    const bLat = Math.round(c.latitude / precision) * precision;
    const bLng = Math.round(c.longitude / precision) * precision;
    const key = `${bLat.toFixed(4)},${bLng.toFixed(4)}`;
    if (!buckets[key]) {
      buckets[key] = {
        id: key,
        coordinate: { latitude: bLat, longitude: bLng },
        count: 0,
        locationNames: {},
        isCluster: true,
        capsules: [],
      };
    }
    buckets[key].count += 1;
    buckets[key].capsules.push(c);
    const loc = c.location_name;
    if (loc) {
      buckets[key].locationNames[loc] = (buckets[key].locationNames[loc] || 0) + 1;
    }
    // Keep representative coordinate as the first capsule's actual coord
    if (buckets[key].count === 1) {
      buckets[key].coordinate = { latitude: c.latitude, longitude: c.longitude };
    }
  });

  return Object.values(buckets).map((b) => {
    // Pick the most-common location name for this cluster
    const names = Object.entries(b.locationNames);
    const topName =
      names.length > 0
        ? names.sort((a, z) => z[1] - a[1])[0][0]
        : null;
    return { ...b, label: topName };
  });
}

// ─── Marker components ────────────────────────────────────────────────────────

const makePinStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      alignItems: "center",
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 10,
      shadowColor: colors.primary,
      shadowOpacity: 0.6,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    singleBadge: {
      paddingHorizontal: 7,
    },
    countBubble: {
      backgroundColor: "rgba(10,10,15,0.88)",
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginTop: 2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    countText: {
      fontSize: 9,
      lineHeight: 13,
      color: colors.foreground,
      fontWeight: "700",
    },
    tip: {
      width: 0,
      height: 0,
      borderLeftWidth: 5,
      borderRightWidth: 5,
      borderTopWidth: 7,
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
      borderTopColor: colors.primary,
      marginTop: -1,
    },
  });

function ClusterPin({ count }) {
  const { colors } = useTheme();
  const pinStyles = useMemo(() => makePinStyles(colors), [colors]);
  const display = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
  return (
    <View style={pinStyles.wrapper}>
      <View style={pinStyles.badge}>
        <Ionicons name="lock-closed" size={9} color={colors.primaryFg} />
      </View>
      <View style={pinStyles.tip} />
      <View style={pinStyles.countBubble}>
        <Text style={pinStyles.countText}>{display}</Text>
      </View>
    </View>
  );
}

function SinglePin() {
  const { colors } = useTheme();
  const pinStyles = useMemo(() => makePinStyles(colors), [colors]);
  return (
    <View style={pinStyles.wrapper}>
      <View style={[pinStyles.badge, pinStyles.singleBadge]}>
        <Ionicons name="lock-closed" size={11} color={colors.primaryFg} />
      </View>
      <View style={pinStyles.tip} />
      <View style={pinStyles.countBubble}>
        <Text style={pinStyles.countText}>1</Text>
      </View>
    </View>
  );
}

// ─── ClusterModal ─────────────────────────────────────────────────────────────

const makeCardStyles = (colors) =>
  StyleSheet.create({
    card: {
      width: 260,
      marginHorizontal: 8,
      backgroundColor: colors.background,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 10,
    },
    fromRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: `${colors.primary}22`,
      borderWidth: 1,
      borderColor: `${colors.primary}44`,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "700",
      color: colors.foreground,
    },
    fromLabel: {
      fontSize: 12,
      lineHeight: 17,
      color: colors.mutedFg,
      flex: 1,
    },
    title: {
      fontSize: 15,
      fontWeight: "500",
      color: colors.foreground,
      lineHeight: 22,
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    statusText: {
      fontSize: 11,
      lineHeight: 16,
      fontWeight: "500",
    },
  });

function CapsuleCarouselCard({ capsule, onPress }) {
  const { colors } = useTheme();
  const cardStyles = useMemo(() => makeCardStyles(colors), [colors]);
  const title = capsule.title || "Untitled Capsule";
  const username = capsule.created_by_username || "futrr user";
  const initial = username[0].toUpperCase();
  const status = capsule.status || "sealed";
  const unlockAt = capsule.unlock_at;

  const statusLabel = status === "unlocked" ? "Unlocked" : "Sealed";
  const statusColor = status === "unlocked" ? colors.primary : colors.mutedFg;

  let dateLabel = "";
  if (unlockAt) {
    try {
      dateLabel = new Date(unlockAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      dateLabel = "";
    }
  }

  return (
    <Pressable onPress={onPress} style={cardStyles.card}>
      {/* From row */}
      <View style={cardStyles.fromRow}>
        <View style={cardStyles.avatar}>
          <Text style={cardStyles.avatarText}>{initial}</Text>
        </View>
        <Text style={cardStyles.fromLabel} numberOfLines={1}>
          From {username}
        </Text>
      </View>

      {/* Title */}
      <Text style={cardStyles.title} numberOfLines={2}>{title}</Text>

      {/* Status badge */}
      <View style={cardStyles.statusRow}>
        <Ionicons
          name={status === "unlocked" ? "lock-open-outline" : "lock-closed-outline"}
          size={12}
          color={statusColor}
        />
        <Text style={[cardStyles.statusText, { color: statusColor }]}>
          {statusLabel}
          {dateLabel ? ` · ${dateLabel}` : ""}
        </Text>
      </View>
    </Pressable>
  );
}

const makeModalStyles = (colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: "60%",
      borderTopWidth: 1,
      borderColor: colors.border,
      paddingBottom: 24,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginTop: 10,
      marginBottom: 4,
    },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      gap: 12,
    },
    locationTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.foreground,
    },
    capsuleCount: {
      fontSize: 12,
      lineHeight: 17,
      color: colors.mutedFg,
      marginTop: 2,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: `${colors.mutedFg}22`,
      alignItems: "center",
      justifyContent: "center",
    },
    list: {
      paddingHorizontal: 8,
      paddingVertical: 16,
    },
  });

function ClusterModal({ cluster, onClose, onCapsulePress }) {
  const { colors } = useTheme();
  const modalStyles = useMemo(() => makeModalStyles(colors), [colors]);
  if (!cluster) return null;

  const locationTitle = cluster.label || "Capsules";
  const capsules = cluster.capsules || [];

  return (
    <Modal
      visible={!!cluster}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={modalStyles.overlay} onPress={onClose}>
        <Pressable style={modalStyles.sheet} onPress={() => {}}>
          {/* Header */}
          <View style={modalStyles.header}>
            <View style={modalStyles.handle} />
            <View style={modalStyles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={modalStyles.locationTitle} numberOfLines={1}>
                  {locationTitle}
                </Text>
                <Text style={modalStyles.capsuleCount}>
                  {capsules.length} capsule{capsules.length !== 1 ? "s" : ""} here
                </Text>
              </View>
              <Pressable onPress={onClose} style={modalStyles.closeBtn}>
                <Ionicons name="close" size={18} color={colors.mutedFg} />
              </Pressable>
            </View>
          </View>

          {/* Carousel */}
          <FlatList
            data={capsules}
            keyExtractor={(item) => String(item.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={modalStyles.list}
            renderItem={({ item }) => (
              <CapsuleCarouselCard
                capsule={item}
                onPress={() => onCapsulePress(item)}
              />
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// 1 mile in degrees (approx)
const ONE_MILE_DEG = 1 / 69;
const ONE_MILE_METERS = 1609.34;

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const makeStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    locatingText: {
      fontSize: 14,
      color: colors.mutedFg,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerSub: {
      fontSize: 10,
      lineHeight: 14,
      color: colors.mutedFg,
      letterSpacing: 2,
      textTransform: "uppercase",
      textAlign: "center",
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "300",
      color: colors.foreground,
      textAlign: "center",
    },
    mapContainer: {
      flex: 1,
      overflow: "hidden",
      position: "relative",
    },
    map: {
      width: "100%",
      height: "100%",
    },
    statsOverlay: {
      position: "absolute",
      top: 16,
      left: 16,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    statPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "rgba(10,10,15,0.85)",
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statPillText: {
      fontSize: 12,
      lineHeight: 17,
      color: colors.foreground,
      fontWeight: "500",
    },
    zoomPill: {
      borderColor: `${colors.primary}50`,
    },
    zoomPillText: {
      fontSize: 11,
      lineHeight: 16,
      color: colors.primary,
      fontWeight: "500",
    },
    recenterBtn: {
      position: "absolute",
      bottom: 24,
      right: 16,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(10,10,15,0.88)",
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 6,
    },
  });

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function AtlasScreen() {
  const { colors, isDark, mapStyle } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation();
  const mapRef = useRef(null);

  const [locationGranted, setLocationGranted] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [initialRegion, setInitialRegion] = useState(null);
  const [locating, setLocating] = useState(true);

  const [rawCapsules, setRawCapsules] = useState([]);
  const [currentRegion, setCurrentRegion] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);

  // ── Request location + set initial region ──────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        const granted = status === "granted";
        setLocationGranted(granted);

        if (granted) {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setUserCoords(coords);
          // Start zoomed to ~1 mile view
          const region = {
            ...coords,
            latitudeDelta: ONE_MILE_DEG * 3,
            longitudeDelta: ONE_MILE_DEG * 3,
          };
          setInitialRegion(region);
          setCurrentRegion(region);
          loadCapsules(region);
        } else {
          // Fallback to a broad view if location denied
          const region = {
            latitude: 37.7749,
            longitude: -122.4194,
            latitudeDelta: 20,
            longitudeDelta: 20,
          };
          setInitialRegion(region);
          setCurrentRegion(region);
          loadCapsules(region);
        }
      } catch {
        const region = {
          latitude: 37.7749,
          longitude: -122.4194,
          latitudeDelta: 20,
          longitudeDelta: 20,
        };
        setInitialRegion(region);
        setCurrentRegion(region);
        loadCapsules(region);
      } finally {
        setLocating(false);
      }
    })();
  }, []);

  // ── Load capsules for visible region ──────────────────────────────────────
  const loadCapsules = useCallback(async (region) => {
    try {
      const bounds = {
        lat_min: region.latitude - region.latitudeDelta / 2,
        lat_max: region.latitude + region.latitudeDelta / 2,
        lng_min: region.longitude - region.longitudeDelta / 2,
        lng_max: region.longitude + region.longitudeDelta / 2,
      };
      const data = await getMapCapsules(bounds);
      setRawCapsules(data);
    } catch {
      // keep existing data on error
    }
  }, []);

  const handleRegionChange = useCallback(
    (region) => {
      setCurrentRegion(region);
      loadCapsules(region);
    },
    [loadCapsules]
  );

  // ── Filter capsules to within 1 mile of user, then compute pins ────────────
  const nearbyCapsules = useMemo(() => {
    if (!userCoords) return rawCapsules;
    return rawCapsules.filter((c) => {
      if (c.latitude == null || c.longitude == null) return false;
      const dist = haversineDistance(
        userCoords.latitude, userCoords.longitude,
        parseFloat(c.latitude), parseFloat(c.longitude)
      );
      return dist <= ONE_MILE_METERS;
    });
  }, [rawCapsules, userCoords]);

  const pins = useMemo(() => {
    if (!currentRegion) return [];
    return clusterCapsules(nearbyCapsules, currentRegion.latitudeDelta);
  }, [nearbyCapsules, currentRegion]);

  const totalCapsules = nearbyCapsules.length;
  const isZoomedIn = currentRegion && currentRegion.latitudeDelta <= ZOOM_STREET;

  // ── Re-center on user ──────────────────────────────────────────────────────
  const recenter = useCallback(async () => {
    if (!locationGranted) return;
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setUserCoords(coords);
      const region = {
        ...coords,
        latitudeDelta: ONE_MILE_DEG * 3,
        longitudeDelta: ONE_MILE_DEG * 3,
      };
      mapRef.current?.animateToRegion(region, 600);
    } catch {}
  }, [locationGranted]);

  // ── Capsule press handler ──────────────────────────────────────────────────
  const handleCapsulePress = useCallback((rawCapsule) => {
    setSelectedCluster(null);
    const normalized = normalizeCapsule(rawCapsule);
    if (rawCapsule.status === "unlocked") {
      navigation.navigate(ROUTES.UNLOCKED_CAPSULE, { capsule: normalized });
    } else {
      navigation.navigate(ROUTES.LOCKED_CAPSULE, { capsule: normalized });
    }
  }, [navigation]);

  if (locating || !initialRegion) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>
          <View>
            <Text style={styles.headerSub}>EXPLORE</Text>
            <Text style={styles.headerTitle}>Atlas</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.locatingText}>Finding your location…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <View>
          <Text style={styles.headerSub}>EXPLORE</Text>
          <Text style={styles.headerTitle}>Atlas</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation={locationGranted}
          showsCompass={false}
          showsScale={false}
          customMapStyle={mapStyle}
          userInterfaceStyle={isDark ? "dark" : "light"}
          onRegionChangeComplete={handleRegionChange}
        >
          {pins.map((pin) => (
            <Marker
              key={pin.id}
              coordinate={pin.coordinate}
              onPress={() => setSelectedCluster(pin)}
              tracksViewChanges={false}
            >
              {pin.isCluster ? (
                <ClusterPin count={pin.count} />
              ) : (
                <SinglePin />
              )}
            </Marker>
          ))}
        </MapView>

        {/* Stats overlay */}
        <View style={styles.statsOverlay}>
          <View style={styles.statPill}>
            <Ionicons name="earth-outline" size={14} color={colors.primary} />
            <Text style={styles.statPillText}>{pins.length} locations</Text>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="lock-closed-outline" size={14} color={colors.primary} />
            <Text style={styles.statPillText}>
              {totalCapsules.toLocaleString()} nearby
            </Text>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="navigate-circle-outline" size={14} color={colors.primary} />
            <Text style={styles.statPillText}>1 mi radius</Text>
          </View>
          {isZoomedIn && (
            <View style={[styles.statPill, styles.zoomPill]}>
              <Text style={styles.zoomPillText}>Individual pins</Text>
            </View>
          )}
        </View>

        {/* Re-center button */}
        {locationGranted && (
          <Pressable style={styles.recenterBtn} onPress={recenter}>
            <Ionicons name="locate-outline" size={20} color={colors.primary} />
          </Pressable>
        )}
      </View>

      {/* Cluster modal */}
      <ClusterModal
        cluster={selectedCluster}
        onClose={() => setSelectedCluster(null)}
        onCapsulePress={handleCapsulePress}
      />
    </SafeAreaView>
  );
}

